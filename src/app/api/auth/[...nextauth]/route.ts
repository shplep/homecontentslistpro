/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        console.log('Authorization attempt for:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          throw new Error('Missing email or password');
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          console.log('User found:', !!user);

          if (!user) {
            console.log('User not found for email:', credentials.email);
            throw new Error('No user found with this email');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          console.log('Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('Invalid password for user:', credentials.email);
            throw new Error('Invalid password');
          }

          console.log('Authentication successful for:', user.email);
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async redirect({ url, baseUrl }: any) {
      // Handle redirects properly with basePath
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.sub || '';
        session.user.role = token.role || 'USER';
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
} as any);

export { handler as GET, handler as POST };
