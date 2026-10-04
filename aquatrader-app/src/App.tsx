import { useEffect, useState } from 'react';
import { BrowserRouter, Link as RouterLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Card,
  Container,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import './App.css';
import { ListingPage } from './pages/ListingPage';
import { ListingEodChart } from './pages/Listing/ListingEodChart';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';

function LandingPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Card className="hero-card" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 2 }}>
          Aquatrader
        </Typography>
        <Typography variant="h2" component="h1" sx={{ mt: 2, mb: 2, fontWeight: 700 }}>
          Smarter market insight starts here.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 720, mx: 'auto' }}>
          Track listings, monitor fundamentals, and review end-of-day pricing in one clean workspace.
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button component={RouterLink} to="/listing" variant="contained" size="large">
            Open Listing Page
          </Button>
          <Button component={RouterLink} to="/listing/eod-chart/1?fromDate=2026-09-01&toDate=2026-09-30" variant="contained" color="secondary" size="large">
            Open EOD Chart
          </Button>
          <Button component={RouterLink} to="/" variant="outlined" size="large">
            Home
          </Button>
        </Box>
      </Card>
    </Container>
  );
}

function ListingEodChartRoute() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const routeListingId = Number(params.listingId ?? searchParams.get('listingId') ?? '1');
  const fromDate = searchParams.get('fromDate') ?? '2025-01-01';
  const toDate = searchParams.get('toDate') ?? '2025-01-31';

  const [listingIdInput, setListingIdInput] = useState(String(routeListingId));

  useEffect(() => {
    setListingIdInput(String(routeListingId));
  }, [routeListingId]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(listingIdInput);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return;
    }

    navigate(`/listing/eod-chart/${parsed}?fromDate=${fromDate}&toDate=${toDate}`);
  };

  const safeListingId = Number.isInteger(routeListingId) && routeListingId > 0 ? routeListingId : 1;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card sx={{ mb: 3 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: 'center' }}
          >
            <TextField
              label="Listing ID"
              value={listingIdInput}
              onChange={(event) => setListingIdInput(event.target.value)}
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 180 } }}
            />
            <TextField
              label="From"
              type="date"
              value={fromDate}
              onChange={(event) => navigate(`/listing/eod-chart/${safeListingId}?fromDate=${event.target.value}&toDate=${toDate}`)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="To"
              type="date"
              value={toDate}
              onChange={(event) => navigate(`/listing/eod-chart/${safeListingId}?fromDate=${fromDate}&toDate=${event.target.value}`)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button type="submit" variant="contained">
              Load chart
            </Button>
          </Stack>
        </Box>
      </Card>

      <ListingEodChart listingId={safeListingId} fromDate={fromDate} toDate={toDate} />
    </Container>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppBar position="static" color="transparent" elevation={0} className="top-nav">
        <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto' }}>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 700 }}>
            AquaTrader
          </Typography>

          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button component={RouterLink} to="/" color="inherit">
              Home
            </Button>
            <Button component={RouterLink} to="/listing" color="inherit">
              ListingPage
            </Button>
            <Button component={RouterLink} to="/listing/eod-chart/1?fromDate=2025-01-01&toDate=2025-01-31" color="inherit">
              ListingEoDChart
            </Button>
            <Button component={RouterLink} to="/login" color="inherit">
              Sign in
            </Button>
            <Button component={RouterLink} to="/register" color="inherit">
              Register
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/listing" element={<ListingPage />} />
        <Route path="/listing/eod-chart/:listingId" element={<ListingEodChartRoute />} />
        <Route path="/listing/eod-chart" element={<ListingEodChartRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
