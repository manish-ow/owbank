import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import Card from '@/models/Card';
import Loan from '@/models/Loan';
import { chatWithGemini } from '@/lib/gemini';
import { generateReference, calculateEMI, getInterestRate, generateCardNumber, generateCVV, generateExpiryDate } from '@/lib/helpers';
import { publishTransactionEvent } from '@/lib/kafka';
import { getServerThemeConfig } from '@/theme/themes';
import { getCountryConfig } from '@/config';

interface ActionResult {
  text: string;
  type: string;
  data?: any;
}

async function executeAction(action: any, userId: string, accountNumber: string): Promise<ActionResult> {
  await connectToDatabase();

  switch (action.action) {
    case 'GET_BALANCE': {
      const account = await Account.findOne({ accountNumber });
      if (!account) return { text: 'Account not found.', type: 'error' };
      return {
        text: `Your **${account.accountType}** account (**${account.accountNumber}**) has a balance of **$${account.balance.toFixed(2)}**.`,
        type: 'balance',
        data: { balance: account.balance, accountNumber: account.accountNumber, accountType: account.accountType },
      };
    }

    case 'GET_TRANSACTIONS': {
      const limit = action.params?.limit || 5;
      const transactions = await Transaction.find({
        $or: [{ fromAccount: accountNumber }, { toAccount: accountNumber }],
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      if (transactions.length === 0) return { text: 'No recent transactions found.', type: 'transactions', data: { transactions: [] } };

      const txList = transactions.map((t) => {
        const isSender = t.fromAccount === accountNumber;
        const sign = t.type === 'bonus' || !isSender ? '+' : '-';
        return `- ${sign}$${t.amount.toFixed(2)} — ${t.description} (${new Date(t.createdAt).toLocaleDateString()})`;
      });
      return { text: `Here are your recent transactions:\n\n${txList.join('\n')}`, type: 'transactions', data: { count: transactions.length } };
    }

    case 'TRANSFER': {
      const { toAccount, amount, description } = action.params;
      if (!toAccount || !amount) return { text: 'Please provide both a recipient account number and amount.', type: 'error' };

      const senderAccount = await Account.findOne({ accountNumber });
      if (!senderAccount) return { text: 'Your account was not found.', type: 'error' };
      if (senderAccount.balance < amount) return { text: `Insufficient balance. Your current balance is **$${senderAccount.balance.toFixed(2)}**.`, type: 'error' };
      if (toAccount === accountNumber) return { text: 'You cannot transfer to your own account.', type: 'error' };

      const recipientAccount = await Account.findOne({ accountNumber: toAccount });
      if (!recipientAccount) return { text: `Recipient account **${toAccount}** not found. Please check the account number.`, type: 'error' };

      const reference = generateReference();

      try {
        await publishTransactionEvent({
          type: 'TRANSFER_INITIATED',
          fromAccount: accountNumber,
          toAccount,
          amount,
          reference,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        // Continue without Kafka
      }

      senderAccount.balance -= amount;
      recipientAccount.balance += amount;
      await senderAccount.save();
      await recipientAccount.save();

      await Transaction.create({
        reference,
        fromAccount: accountNumber,
        toAccount,
        amount,
        type: 'transfer',
        status: 'completed',
        description: description || `Transfer to ${toAccount}`,
      });

      return {
        text: `Transfer successful!\n\n- **Amount:** $${amount.toFixed(2)}\n- **To:** ${toAccount}\n- **Reference:** ${reference}\n- **New Balance:** $${senderAccount.balance.toFixed(2)}`,
        type: 'transfer_success',
        data: { amount, toAccount, reference, newBalance: senderAccount.balance },
      };
    }

    case 'CARD_CHECK_ELIGIBILITY': {
      const config = getCountryConfig();
      const { employment, income } = action.params || {};
      const annualIncome = Number(income) || 0;
      const cards: { type: string; limit: number; eligible: boolean; recommended: boolean }[] = [];
      const sym = config.currency.symbol;

      // Determine eligibility based on income
      cards.push({
        type: 'standard',
        limit: config.cardLimits.standard,
        eligible: annualIncome >= 0,
        recommended: annualIncome < 60000,
      });
      cards.push({
        type: 'gold',
        limit: config.cardLimits.gold,
        eligible: annualIncome >= 40000,
        recommended: annualIncome >= 60000 && annualIncome < 120000,
      });
      cards.push({
        type: 'platinum',
        limit: config.cardLimits.platinum,
        eligible: annualIncome >= 80000,
        recommended: annualIncome >= 120000,
      });

      const eligibleCards = cards.filter(c => c.eligible);
      const cardLines = eligibleCards.map(c =>
        `- **${c.type.charAt(0).toUpperCase() + c.type.slice(1)}** — ${sym}${c.limit.toLocaleString()} limit${c.recommended ? ' ✨ *Recommended*' : ''}`
      );

      return {
        text: `Based on your ${employment || 'employment'} status and annual income of ${sym}${annualIncome.toLocaleString()}, here are your eligible cards:\n\n${cardLines.join('\n')}\n\nWhich card would you like to apply for?`,
        type: 'card_eligibility',
        data: { employment, income: annualIncome, eligibleCards },
      };
    }

    case 'APPLY_CREDIT_CARD': {
      const config = getCountryConfig();
      const sym = config.currency.symbol;
      const { cardType, confirmed } = action.params;
      if (!cardType) return { text: 'Please specify a card type: **standard**, **gold**, or **platinum**.', type: 'pick_card' };
      if (!confirmed) return { text: `Please confirm you want to apply for the **${cardType}** card.`, type: 'card_confirm', data: { cardType } };

      const existingCard = await Card.findOne({ userId, cardType, status: { $ne: 'cancelled' } });
      if (existingCard) return { text: `You already have a **${cardType}** credit card.`, type: 'error' };

      const limitMap: Record<string, number> = {
        standard: config.cardLimits.standard,
        gold: config.cardLimits.gold,
        platinum: config.cardLimits.platinum,
      };
      const creditLimit = limitMap[cardType] || config.cardLimits.standard;

      const card = await Card.create({
        userId,
        accountNumber,
        cardNumber: generateCardNumber(),
        cardType,
        creditLimit,
        expiryDate: generateExpiryDate(),
        cvv: generateCVV(),
      });

      return {
        text: `Your **${cardType}** credit card has been issued! 🎉\n\n- **Card Number:** ****-****-****-${card.cardNumber.slice(-4)}\n- **Credit Limit:** ${sym}${card.creditLimit.toLocaleString()}\n- **Expiry:** ${card.expiryDate}\n- **Status:** Active`,
        type: 'card_issued',
        data: { cardType, lastFour: card.cardNumber.slice(-4), creditLimit: card.creditLimit },
      };
    }

    case 'LOAN_CHECK_CREDIT_SCORE': {
      const config = getCountryConfig();
      const sym = config.currency.symbol;
      const { amount: reqAmount, tenure: reqTenure, purpose: reqPurpose, income: reqIncome } = action.params || {};
      const loanAmt = Number(reqAmount) || 0;
      const loanTenure = Number(reqTenure) || 12;
      const loanIncome = Number(reqIncome) || 0;

      // Validate against country limits
      if (loanAmt < config.loanSettings.minAmount || loanAmt > config.loanSettings.maxAmount) {
        return {
          text: `Loan amount must be between ${sym}${config.loanSettings.minAmount.toLocaleString()} and ${sym}${config.loanSettings.maxAmount.toLocaleString()}.`,
          type: 'error',
        };
      }

      // Generate credit score (simulated)
      const score = Math.floor(650 + Math.random() * 200);
      let rating = 'Fair';
      if (score >= 800) rating = 'Excellent';
      else if (score >= 720) rating = 'Good';
      else if (score >= 650) rating = 'Fair';
      else rating = 'Poor';

      const rate = getInterestRate(score);
      const emi = calculateEMI(loanAmt, rate, loanTenure);
      const totalRepayment = Math.round(emi * loanTenure);

      return {
        text: `Your credit score is **${score}** (${rating}).\n\nBased on your score and income of ${sym}${loanIncome.toLocaleString()}, here's your loan offer:\n\n- **Amount:** ${sym}${loanAmt.toLocaleString()}\n- **Interest Rate:** ${rate}%\n- **Tenure:** ${loanTenure} months\n- **EMI:** ${sym}${emi.toLocaleString()}/month\n- **Total Repayment:** ${sym}${totalRepayment.toLocaleString()}\n\nWould you like to accept this offer?`,
        type: 'loan_offer',
        data: { score, rating, rate, emi, totalRepayment, amount: loanAmt, tenure: loanTenure, purpose: reqPurpose, income: loanIncome },
      };
    }

    case 'LOAN_CONFIRM': {
      const config = getCountryConfig();
      const sym = config.currency.symbol;
      const { amount: loanAmount, tenure, purpose, creditScore, interestRate, emi, income } = action.params;
      if (!loanAmount) return { text: 'Missing loan amount.', type: 'error' };
      const finalTenure = tenure || 12;
      const finalPurpose = purpose || 'Personal';
      const score = creditScore || Math.floor(650 + Math.random() * 200);
      const rate = interestRate || getInterestRate(score);
      const finalEmi = emi || calculateEMI(loanAmount, rate, finalTenure);
      const status = score >= 650 ? 'approved' : 'applied';

      const loan = await Loan.create({
        userId,
        accountNumber,
        amount: loanAmount,
        interestRate: rate,
        tenure: finalTenure,
        emiAmount: finalEmi,
        purpose: finalPurpose,
        status,
        creditScore: score,
        remainingAmount: loanAmount,
      });

      if (status === 'approved') {
        const account = await Account.findOne({ accountNumber });
        if (account) {
          account.balance += loanAmount;
          await account.save();
          loan.status = 'disbursed' as any;
          await loan.save();
        }
      }

      const wasDisbursed = loan.status === ('disbursed' as any) || status === 'approved';

      return {
        text: `Loan **${wasDisbursed ? 'approved and disbursed' : status}**! 🎉\n\n- **Amount:** ${sym}${loanAmount.toLocaleString()}\n- **Interest Rate:** ${rate}%\n- **Tenure:** ${finalTenure} months\n- **EMI:** ${sym}${finalEmi.toLocaleString()}/month\n- **Credit Score:** ${score}${wasDisbursed ? `\n\n${sym}${loanAmount.toLocaleString()} has been **credited** to your account.` : ''}`,
        type: 'loan_result',
        data: { amount: loanAmount, rate, tenure: finalTenure, emi: finalEmi, score, status: wasDisbursed ? 'disbursed' : status, income },
      };
    }

    case 'GET_CREDIT_SCORE': {
      const score = Math.floor(650 + Math.random() * 200);
      let rating = 'Fair';
      if (score >= 800) rating = 'Excellent';
      else if (score >= 720) rating = 'Good';
      else if (score >= 650) rating = 'Fair';
      else rating = 'Poor';
      return { text: `Your credit score is **${score}** (${rating}).`, type: 'credit_score', data: { score, rating } };
    }

    default:
      return { text: 'I could not process that action. Please try again.', type: 'error' };
  }
}

function findActionJsonBlock(text: string): { json: string; start: number; end: number } | null {
  // Find the start of an action JSON block
  const actionStart = text.search(/\{\s*"action"\s*:/);
  if (actionStart === -1) return null;

  // Walk forward counting braces to find the matching closing brace
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = actionStart; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return { json: text.slice(actionStart, i + 1), start: actionStart, end: i + 1 }; }
  }
  return null;
}

function cleanAiResponse(text: string): string {
  let cleaned = text;
  // Remove markdown code fences wrapping JSON action blocks
  cleaned = cleaned.replace(/```(?:json)?\s*[\s\S]*?"action"[\s\S]*?```/g, '');
  // Remove standalone action JSON blocks (with nested braces)
  const block = findActionJsonBlock(cleaned);
  if (block) {
    cleaned = cleaned.slice(0, block.start) + cleaned.slice(block.end);
  }
  // Remove empty code fences
  cleaned = cleaned.replace(/```(?:json)?\s*```/g, '');
  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

function extractActionJson(text: string): any | null {
  // Try code fence wrapped JSON first
  const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?"action"[\s\S]*?)```/);
  if (codeFenceMatch) {
    const innerBlock = findActionJsonBlock(codeFenceMatch[1]);
    if (innerBlock) {
      try { return JSON.parse(innerBlock.json); } catch { }
    }
  }
  // Try standalone JSON
  const block = findActionJsonBlock(text);
  if (block) {
    try { return JSON.parse(block.json); } catch { }
  }
  return null;
}

function getSuggestedActions(actionType: string | null): any[] {
  switch (actionType) {
    case 'balance':
      return [
        { label: 'Transactions', icon: '📋', message: 'Show my last 5 transactions' },
        { label: 'Transfer Money', icon: '↗️', message: 'I want to transfer money' },
        { label: 'Apply for Card', icon: '💳', message: 'I want to apply for a credit card' },
      ];
    case 'transactions':
      return [
        { label: 'Check Balance', icon: '💰', message: 'Show my account balance' },
        { label: 'Transfer Money', icon: '↗️', message: 'I want to transfer money' },
        { label: 'More Transactions', icon: '📋', message: 'Show my last 10 transactions' },
      ];
    case 'transfer_success':
      return [
        { label: 'Check Balance', icon: '💰', message: 'Show my updated balance' },
        { label: 'Transactions', icon: '📋', message: 'Show my last 5 transactions' },
        { label: 'Another Transfer', icon: '↗️', message: 'I want to make another transfer' },
      ];
    case 'card_issued':
      return [
        { label: 'Check Balance', icon: '💰', message: 'Show my account balance' },
        { label: 'Apply for Loan', icon: '🏦', message: 'I want to apply for a loan' },
        { label: 'Credit Score', icon: '📊', message: 'What is my credit score?' },
      ];
    case 'card_eligibility':
      return [
        { label: 'Standard', icon: '💳', message: 'I want the standard card' },
        { label: 'Gold', icon: '🥇', message: 'I want the gold card' },
        { label: 'Platinum', icon: '💎', message: 'I want the platinum card' },
      ];
    case 'card_confirm':
      return [
        { label: 'Yes, proceed', icon: '✅', message: 'Yes, please proceed with the application' },
        { label: 'No, cancel', icon: '❌', message: 'No, I changed my mind' },
      ];
    case 'loan_offer':
      return [
        { label: 'Accept Offer', icon: '✅', message: 'Yes, I accept the loan offer' },
        { label: 'No Thanks', icon: '❌', message: 'No, I want to reconsider' },
      ];
    case 'loan_result':
      return [
        { label: 'Check Balance', icon: '💰', message: 'Show my updated balance' },
        { label: 'Transactions', icon: '📋', message: 'Show my last 5 transactions' },
        { label: 'Apply for Card', icon: '💳', message: 'I want to apply for a credit card' },
      ];
    case 'credit_score':
      return [
        { label: 'Apply for Loan', icon: '🏦', message: 'I want to apply for a loan' },
        { label: 'Apply for Card', icon: '💳', message: 'I want to apply for a credit card' },
        { label: 'Check Balance', icon: '💰', message: 'Show my account balance' },
      ];
    case 'pick_card':
      return [
        { label: 'Standard', icon: '💳', message: 'I want a standard credit card' },
        { label: 'Gold', icon: '🥇', message: 'I want a gold credit card' },
        { label: 'Platinum', icon: '💎', message: 'I want a platinum credit card' },
      ];
    case 'transfer_prompt':
      return [
        { label: 'Check Balance', icon: '💰', message: 'Show my account balance' },
        { label: 'Cancel', icon: '❌', message: 'Never mind, cancel the transfer' },
      ];
    case 'loan_prompt':
      return [
        { label: '$5,000 Loan', icon: '🏦', message: 'I want a $5,000 loan for 12 months' },
        { label: '$10,000 Loan', icon: '🏦', message: 'I want a $10,000 loan for 24 months' },
        { label: '$25,000 Loan', icon: '🏦', message: 'I want a $25,000 loan for 36 months' },
      ];
    default:
      return [
        { label: 'Check Balance', icon: '💰', message: 'Show my account balance' },
        { label: 'Transactions', icon: '📋', message: 'Show my last 5 transactions' },
        { label: 'Apply for Card', icon: '💳', message: 'I want to apply for a credit card' },
        { label: 'Apply for Loan', icon: '🏦', message: 'I want to apply for a loan' },
        { label: 'Transfer Money', icon: '↗️', message: 'I want to transfer money' },
      ];
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const account = await Account.findOne({ userId: user._id });
    if (!account) return NextResponse.json({ error: 'No account found' }, { status: 404 });

    const { messages, imageData, imageMimeType } = await req.json();

    // REQ5: Server-side guard - detect clearly non-banking queries to save API calls
    const lastUserMsg = messages[messages.length - 1]?.parts?.[0]?.text?.toLowerCase() || '';
    const nonBankingPatterns = [
      /\b(joke|funny|humor|laugh)\b/,
      /\b(recipe|cook|bake|ingredient)\b/,
      /\b(weather|forecast|temperature)\b/,
      /\b(poem|poetry|story|tale|fiction)\b/,
      /\b(code|program|javascript|python|html|css)\b/,
      /\b(movie|film|song|music|lyrics|actor|actress)\b/,
      /\b(game|play|sport|football|cricket|basketball)\b/,
      /\b(travel|vacation|flight|hotel|tourism)\b/,
      /\b(diet|exercise|workout|fitness|yoga)\b/,
      /\b(astrology|horoscope|zodiac)\b/,
    ];
    const isNonBanking = nonBankingPatterns.some((pattern) => pattern.test(lastUserMsg));
    if (isNonBanking) {
      const theme = getServerThemeConfig();
      return NextResponse.json({
        response: `I'm your ${theme.fullName} assistant and can only help with banking services like checking balances, transfers, credit cards, and loans. How can I assist you with your banking needs today?`,
        agent: 'Manager',
        actionType: null,
        actionData: null,
        suggestedActions: getSuggestedActions(null),
      });
    }

    // If image data is present, add it as an inlineData part to the last message
    const processedMessages = [...messages];
    if (imageData && imageMimeType) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg) {
        lastMsg.parts = [
          ...lastMsg.parts,
          { inlineData: { data: imageData, mimeType: imageMimeType } },
        ];
      }
    }

    const aiResponse = await chatWithGemini(processedMessages, {
      userId: user._id.toString(),
      accountNumber: account.accountNumber,
      userName: user.name,
    });

    // Extract and execute action
    let action = extractActionJson(aiResponse);
    let conversationalText = cleanAiResponse(aiResponse);
    let actionType: string | null = null;
    let actionData: any = null;
    let finalResponse: string;

    // Fallback: if user asked for something but Gemini didn't produce an action, auto-detect
    if (!action) {
      const lastUserMsg = messages[messages.length - 1]?.parts?.[0]?.text?.toLowerCase() || '';
      if (lastUserMsg.includes('balance')) {
        action = { action: 'GET_BALANCE' };
      } else if (lastUserMsg.includes('transaction') || lastUserMsg.includes('history')) {
        action = { action: 'GET_TRANSACTIONS', params: { limit: 5 } };
      } else if (lastUserMsg.includes('credit score')) {
        action = { action: 'GET_CREDIT_SCORE' };
      }
    }

    if (action) {
      const result = await executeAction(action, user._id.toString(), account.accountNumber);
      actionType = result.type;
      actionData = result.data;
      // Only use Gemini's conversational text if it's short and not hallucinated data
      const isHallucinated = conversationalText.length > 200 && (conversationalText.includes('Date:') || conversationalText.includes('Amount:'));
      const cleanConvo = isHallucinated ? '' : conversationalText;
      finalResponse = cleanConvo
        ? `${cleanConvo}\n\n${result.text}`
        : result.text;
    } else {
      finalResponse = conversationalText;
      // Detect context for suggested actions when no action was executed
      const lower = aiResponse.toLowerCase();
      if (
        (lower.includes('standard') && lower.includes('gold') && lower.includes('platinum')) ||
        lower.includes('which type of card') || lower.includes('card type') ||
        lower.includes('which one would you like') || lower.includes('which card')
      ) {
        actionType = 'pick_card';
      } else if (lower.includes('transfer') && (lower.includes('account number') || lower.includes('how much'))) {
        actionType = 'transfer_prompt';
      } else if (lower.includes('loan') && (lower.includes('how much') || lower.includes('amount'))) {
        actionType = 'loan_prompt';
      }
    }

    // Determine agent type
    let agent = 'Manager';
    const lower = (finalResponse || '').toLowerCase();
    if (lower.includes('transfer') || lower.includes('transaction') || actionType === 'transfer_success' || actionType === 'transactions') {
      agent = 'Transaction';
    } else if (lower.includes('card') || lower.includes('credit limit') || actionType === 'card_issued' || actionType === 'pick_card') {
      agent = 'Card';
    } else if (lower.includes('loan') || lower.includes('emi') || lower.includes('tenure') || actionType === 'loan_result') {
      agent = 'Loan';
    }

    const suggestedActions = getSuggestedActions(actionType);

    return NextResponse.json({
      response: finalResponse || "I'm here to help! Ask me about your balance, transactions, or apply for cards and loans.",
      agent,
      actionType,
      actionData,
      suggestedActions,
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    let friendlyMessage = 'Something went wrong. Please try again.';
    if (error.message?.includes('429') || error.message?.includes('Too Many Requests') || error.message?.includes('Resource exhausted')) {
      friendlyMessage = 'The AI service is temporarily busy. Please wait a moment and try again.';
    } else if (error.message?.includes('API key') || error.message?.includes('PERMISSION_DENIED')) {
      friendlyMessage = 'AI service configuration issue. Please contact support.';
    }
    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
