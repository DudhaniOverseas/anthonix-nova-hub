import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import VerifyPhone from "./pages/VerifyPhone";
import MyAccount from "./pages/MyAccount";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import PagesPage from "./pages/admin/PagesPage";
import PostsPage from "./pages/admin/PostsPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import MenusPage from "./pages/admin/MenusPage";
import MediaPage from "./pages/admin/MediaPage";
import StudentsPage from "./pages/admin/StudentsPage";
import CoursesPage from "./pages/admin/CoursesPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import SettingsPage from "./pages/admin/SettingsPage";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/account" element={<MyAccount />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="pages" element={<PagesPage />} />
              <Route path="posts" element={<PostsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="menus" element={<MenusPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="media" element={<MediaPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
