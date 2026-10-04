import { useState, type FormEvent } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { coreCoreLogin } from '../../api/aquatrader_core';
import type { ICoreCoreLoginRequest } from '../../api/aquatrader_coreTypes';
import { AuthPageLayout } from './AuthPageLayout';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    const request: ICoreCoreLoginRequest = {
      scheme: 'Bearer',
      username: username.trim(),
      password,
    };

    try {
      const result = await coreCoreLogin(request);
      if (result.status < 200 || result.status >= 300) {
        setError(
          result.error?.detail ||
            result.error?.title ||
            `Sign in failed (HTTP ${result.status}). Please check your credentials and try again.`,
        );
        return;
      }

      setSuccess(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Welcome back"
      description="Sign in to continue to your AquaTrader workspace."
      footer={
        <>
          Don’t have an account?{' '}
          <RouterLink to="/register">Create one</RouterLink>
        </>
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && (
          <Alert severity="success">
            You’re signed in. Continue to your <RouterLink to="/listing">workspace</RouterLink>.
          </Alert>
        )}
        <TextField
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </AuthPageLayout>
  );
}
