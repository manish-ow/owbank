import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from './mongodb';
import User from '@/models/User';
import Account from '@/models/Account';

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth provider
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    // Demo credentials provider for prototype
    CredentialsProvider({
      name: 'Demo Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'demo@owbank.com' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        await connectToDatabase();

        let user = await User.findOne({ email: credentials.email });
        if (!user) {
          user = await User.create({
            email: credentials.email,
            name: credentials.email.split('@')[0],
            googleId: `demo-${Date.now()}`,
            hasAccount: false,
          });
        }
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account: oauthAccount }) {
      if (oauthAccount?.provider === 'google') {
        await connectToDatabase();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          await User.create({
            email: user.email,
            name: user.name,
            image: user.image,
            googleId: oauthAccount.providerAccountId,
            hasAccount: false,
          });
        }
      }
      return true;
    },
    async session({ session }) {
      if (session?.user?.email) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          (session.user as any).id = dbUser._id.toString();
          (session.user as any).hasAccount = dbUser.hasAccount;

          if (dbUser.hasAccount) {
            const account = await Account.findOne({ userId: dbUser._id });
            if (account) {
              (session.user as any).accountNumber = account.accountNumber;
            }
          }
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
