import { Box, Card, CardContent, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface AuthPageLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthPageLayout({ title, description, children, footer }: AuthPageLayoutProps) {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 }, flex: 1 }}>
      <Card sx={{ textAlign: 'left' }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 2 }}>
                AquaTrader
              </Typography>
              <Typography variant="h4" component="h1" sx={{ mt: 1, fontWeight: 700 }}>
                {title}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {description}
              </Typography>
            </Box>
            {children}
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {footer}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Link component={RouterLink} to="/" underline="hover">
          Back to AquaTrader
        </Link>
      </Box>
    </Container>
  );
}
