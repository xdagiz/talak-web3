import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiweAuthProvider } from "@/contexts/SiweAuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminGuard } from "@/contexts/AdminGuard";
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import { AdminBlogList, AdminBlogEditor } from "./pages/AdminBlog";
import { AdminChangelogList, AdminChangelogEditor } from "./pages/AdminChangelog";
import AdminSite from "./pages/AdminSite";
import AdminMembers from "./pages/AdminMembers";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminBilling from "./pages/AdminBilling";
import AdminProjects from "./pages/AdminProjects";
import AdminWallets from "./pages/AdminWallets";
import AdminSessions from "./pages/AdminSessions";
import AdminApiKeys from "./pages/AdminApiKeys";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ApiKeys from "./pages/ApiKeys";
import Webhooks from "./pages/Webhooks";
import Activity from "./pages/Activity";
import Notifications, { NotificationDetail } from "./pages/Notifications";
import Integrations from "./pages/Integrations";
import Team from "./pages/Team";
import Docs from "./pages/Docs";
import Install from "./pages/Install";
import Pricing from "./pages/Pricing";
import PricingSteps from "./pages/PricingSteps";
import { StepRouter } from "./components/StepRouter";
// Hobby tier steps
import HobbyStep1 from "./pages/pricing/hobby/Step1";
import HobbyStep2 from "./pages/pricing/hobby/Step2";
import HobbyStep3 from "./pages/pricing/hobby/Step3";
import HobbyStep4 from "./pages/pricing/hobby/Step4";
// Team tier steps
import { TeamStep } from "./pages/pricing/team/TeamStep";
// Scale tier steps
import ScaleStep1 from "./pages/pricing/scale/Step1";
import ScaleStep2 from "./pages/pricing/scale/Step2";
import ScaleStep3 from "./pages/pricing/scale/Step3";
import ScaleStep4 from "./pages/pricing/scale/Step4";
import ScaleStep5 from "./pages/pricing/scale/Step5";
// Enterprise tier steps
import EnterpriseStep1 from "./pages/pricing/enterprise/Step1";
import EnterpriseStep2 from "./pages/pricing/enterprise/Step2";
import EnterpriseStep3 from "./pages/pricing/enterprise/Step3";
import EnterpriseStep4 from "./pages/pricing/enterprise/Step4";
import Billing from "./pages/Billing";
import Usage from "./pages/Usage";
import Changelog from "./pages/Changelog";
import Status from "./pages/Status";
import About from "./pages/About";
import AboutPerson from "./pages/AboutPerson";
import DocSection from "./pages/DocSection";
import ChangelogEntry from "./pages/ChangelogEntry";
import ServiceDetail from "./pages/ServiceDetail";
import IntegrationDetail from "./pages/IntegrationDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import Security from "./pages/legal/Security";
import Cookies from "./pages/legal/Cookies";
import AcceptableUse from "./pages/legal/AcceptableUse";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <WorkspaceProvider>
            <SiweAuthProvider>
            <SidebarProvider>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/legal/terms" element={<Terms />} />
              <Route path="/legal/privacy" element={<Privacy />} />
              <Route path="/legal/security" element={<Security />} />
              <Route path="/legal/cookies" element={<Cookies />} />
              <Route path="/legal/acceptable-use" element={<AcceptableUse />} />
              <Route path="/" element={<Index />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/packages/:slug" element={<PackageDetail />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/:slug" element={<DocSection />} />
              <Route path="/install" element={<Install />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/pricing/:tier/steps" element={<PricingSteps />} />
              {/* Hobby tier steps */}
              <Route path="/pricing/hobby/step/:stepNumber" element={<HobbyStep1 />} />
              <Route path="/pricing/hobby/step/1" element={<HobbyStep1 />} />
              <Route path="/pricing/hobby/step/2" element={<HobbyStep2 />} />
              <Route path="/pricing/hobby/step/3" element={<HobbyStep3 />} />
              <Route path="/pricing/hobby/step/4" element={<HobbyStep4 />} />
              {/* Team tier steps - Protected with StepRouter */}
              <Route 
                path="/pricing/team/step/:stepNumber" 
                element={
                  <StepRouter 
                    tierKey="team" 
                    stepComponents={[TeamStep, TeamStep, TeamStep, TeamStep, TeamStep]} 
                  />
                } 
              />
              {/* Scale tier steps */}
              <Route path="/pricing/scale/step/:stepNumber" element={<ScaleStep1 />} />
              <Route path="/pricing/scale/step/1" element={<ScaleStep1 />} />
              <Route path="/pricing/scale/step/2" element={<ScaleStep2 />} />
              <Route path="/pricing/scale/step/3" element={<ScaleStep3 />} />
              <Route path="/pricing/scale/step/4" element={<ScaleStep4 />} />
              <Route path="/pricing/scale/step/5" element={<ScaleStep5 />} />
              {/* Enterprise tier steps */}
              <Route path="/pricing/enterprise/step/:stepNumber" element={<EnterpriseStep1 />} />
              <Route path="/pricing/enterprise/step/1" element={<EnterpriseStep1 />} />
              <Route path="/pricing/enterprise/step/2" element={<EnterpriseStep2 />} />
              <Route path="/pricing/enterprise/step/3" element={<EnterpriseStep3 />} />
              <Route path="/pricing/enterprise/step/4" element={<EnterpriseStep4 />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/changelog/:version" element={<ChangelogEntry />} />
              <Route path="/status" element={<Status />} />
              <Route path="/status/:slug" element={<ServiceDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/about/:slug" element={<AboutPerson />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/usage" element={<ProtectedRoute><Usage /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/notifications/:id" element={<ProtectedRoute><NotificationDetail /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
              <Route path="/projects/:slug" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
              <Route path="/keys" element={<ProtectedRoute><ApiKeys /></ProtectedRoute>} />
              <Route path="/webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
              <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
              <Route path="/integrations/:slug" element={<ProtectedRoute><IntegrationDetail /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />

              {/* ── Admin (creator only) ── */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
              <Route path="/admin/blog" element={<AdminGuard><AdminBlogList /></AdminGuard>} />
              <Route path="/admin/blog/:id" element={<AdminGuard><AdminBlogEditor /></AdminGuard>} />
              <Route path="/admin/changelog" element={<AdminGuard><AdminChangelogList /></AdminGuard>} />
              <Route path="/admin/changelog/:id" element={<AdminGuard><AdminChangelogEditor /></AdminGuard>} />
              <Route path="/admin/site" element={<AdminGuard><AdminSite /></AdminGuard>} />
              <Route path="/admin/members" element={<AdminGuard><AdminMembers /></AdminGuard>} />
              <Route path="/admin/analytics" element={<AdminGuard><AdminAnalytics /></AdminGuard>} />
              <Route path="/admin/billing" element={<AdminGuard><AdminBilling /></AdminGuard>} />
              <Route path="/admin/projects" element={<AdminGuard><AdminProjects /></AdminGuard>} />
              <Route path="/admin/wallets" element={<AdminGuard><AdminWallets /></AdminGuard>} />
              <Route path="/admin/sessions" element={<AdminGuard><AdminSessions /></AdminGuard>} />
              <Route path="/admin/keys" element={<AdminGuard><AdminApiKeys /></AdminGuard>} />

              <Route path="*" element={<NotFound />} />
              </Routes>
            </SidebarProvider>
            </SiweAuthProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
