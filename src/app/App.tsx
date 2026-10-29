import { Route, Routes } from "react-router";
import { AdminPage, RequireAdmin } from "#modules/admin/index.js";
import {
  ForgotPage,
  JoinPage,
  LoginPage,
  RedirectIfAuthed,
  RequireAuth,
  ResetPage,
} from "#modules/auth/index.js";
import { CatalogPage, DrinkPage } from "#modules/catalog/index.js";
import { InvitesPage } from "#modules/invites/index.js";
import { PeoplePage, PersonPage } from "#modules/people/index.js";
import { MyReviewsPage, ReviewFormPage } from "#modules/review/index.js";
import { Layout } from "./Layout.js";
import { NotFoundPage } from "./NotFoundPage.js";

export function App() {
  return (
    <Routes>
      <Route element={<RedirectIfAuthed />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route path="/join/:token" element={<JoinPage />} />
      </Route>
      <Route path="/reset/:token" element={<ResetPage />} />
      <Route element={<RequireAuth />}>
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
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
