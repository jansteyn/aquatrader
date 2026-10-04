import { useState, type FormEvent } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { coreCoreRegisterUser } from '../../api/aquatrader_core';
import type { ICoreCoreRegisterUserRequest } from '../../api/aquatrader_coreTypes';
import { AuthPageLayout } from './AuthPageLayout';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRegistered(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const request: ICoreCoreRegisterUserRequest = {
      username: username.trim(),
      fullName: fullName.trim(),
      billingAddress: billingAddress.trim(),
      email: email.trim(),
      password,
      passwordHash: null,
      phoneNumber: phoneNumber.trim() || null,
    };

    try {
      const result = await coreCoreRegisterUser(request);
      if (result.status < 200 || result.status >= 300) {
        setError(
          result.error?.detail ||
            result.error?.title ||
            `Account creation failed (HTTP ${result.status}). Please try again.`,
        );
        return;
      }

      setRegistered(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to create your account. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Create your account"
      description="Set up your account to start exploring market insights."
      footer={
        <>
          Already have an account?{' '}
          <RouterLink to="/login">Sign in</RouterLink>
        </>
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {registered && (
          <Alert severity="success">
            Your account has been created. <RouterLink to="/login">Sign in</RouterLink> to continue.
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
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Billing address"
          autoComplete="street-address"
          value={billingAddress}
          onChange={(event) => setBillingAddress(event.target.value)}
          required
          multiline
          minRows={2}
          fullWidth
        />
        <TextField
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          fullWidth
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </Stack>
    </AuthPageLayout>
  );
}
