import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CampaignsPage } from './pages/CampaignsPage';
import { RewardClaimPage } from './pages/RewardClaimPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RewardClaimPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
