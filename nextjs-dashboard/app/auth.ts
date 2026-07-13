import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          // For demo purposes, accept the placeholder credentials
          if (email === 'user@nextmail.com' && password === '123456') {
            return {
              id: '410544b2-4001-4271-9855-fec4b6a6442a',
              name: 'User',
              email: 'user@nextmail.com',
            };
          }
        }

        return null;
      },
    }),
  ],
});
