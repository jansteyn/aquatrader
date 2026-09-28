import { Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';

export function ListingPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Chip label="Listing Overview" color="primary" sx={{ alignSelf: 'flex-start' }} />
            <Typography variant="h4" component="h1">
              Listing details
            </Typography>
            <Typography color="text.secondary">
              This is the default ListingPage placeholder for the AquaTrader app.
            </Typography>
            <Box>
              <Button variant="contained" href="/">
                Back to Home
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
