import { Route, Routes } from "react-router";
import { Layout, RequireAdmin } from "./app/Layout";
import LoginPage from "./features/auth/LoginPage";
import JoinPage from "./features/auth/JoinPage";
import ResetPage from "./features/auth/ResetPage";
import ForgotPage from "./features/auth/ForgotPage";
import ReviewFormPage from "./features/review/ReviewFormPage";
import MyReviewsPage from "./features/review/MyReviewsPage";
import InvitesPage from "./features/invites/InvitesPage";
import CatalogPage from "./features/browse/CatalogPage";
import DrinkPage from "./features/browse/DrinkPage";
import PeoplePage from "./features/browse/PeoplePage";
import PersonPage from "./features/browse/PersonPage";
import AdminPage from "./features/admin/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot" element={<ForgotPage />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="/reset/:token" element={<ResetPage />} />
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="drink/:id" element={<DrinkPage />} />
        <Route path="add" element={<ReviewFormPage />} />
        <Route path="add/:drinkId" element={<ReviewFormPage />} />
        <Route path="mine" element={<MyReviewsPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="people/:id" element={<PersonPage />} />
        <Route path="invites" element={<InvitesPage />} />
        <Route element={<RequireAdmin />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
