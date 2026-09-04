import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getMySubscription, isAdminGranted } from "@/integrations/supabase/subscriptions";
import { getStepProgress, getTierCompletion } from "@/integrations/supabase/step-progress";
import { 
  Users, 
  CreditCard, 
  Activity, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Shield,
  Zap,
  Clock,
  DollarSign,
  BarChart3,
  ArrowRight,
  Plus,
  Key,
  Webhook,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TeamDashboardProps {
  subscription: any;
}

export function TeamDashboard({ subscription }: TeamDashboardProps) {
  const [stepProgress, setStepProgress] = useState<any[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [teamStats, setTeamStats] = useState({
    totalMembers: 1,
    activeProjects: 0,
    apiKeys: 0,
    webhooks: 0,
    monthlyUsage: 0,
    billingCycle: 'monthly'
  });

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      // Load step progress
      const progress = await getStepProgress('team');
      setStepProgress(progress);
      
      const completion = await getTierCompletion('team', 5);
      setCompletionPercentage(completion);

      // Load team statistics
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get projects count
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', user.id);
        
        // Get API keys count
        const { data: apiKeys, error: apiKeysError } = await supabase
          .from('api_keys')
          .select('id')
          .eq('user_id', user.id);
        
        // Get webhooks count
        const { data: webhooks, error: webhooksError } = await supabase
          .from('webhooks')
          .select('id')
          .eq('user_id', user.id);

        // Log errors but don't crash
        if (projectsError) console.error('Projects error:', projectsError);
        if (apiKeysError) console.error('API keys error:', apiKeysError);
        if (webhooksError) console.error('Webhooks error:', webhooksError);

        // Team members come from the get_team_members RPC (scoped org roster).
        let members: unknown[] = [];
        try {
          const { data: m, error: mError } = await supabase.rpc("get_team_members");
          if (!mError) members = (m as unknown[]) ?? [];
          else console.error('Team members error:', mError);
        } catch (e) {
          console.error('Team members error:', e);
        }

        setTeamStats(prev => ({
          ...prev,
          totalMembers: members.length || 1,
          activeProjects: projects?.length || 0,
          apiKeys: apiKeys?.length || 0,
          webhooks: webhooks?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      // Set default values on error
      setStepProgress([]);
      setCompletionPercentage(0);
    }
  };

  const getStepStatus = (stepNumber: number) => {
    // Admin-granted subscriptions are already fully paid & provisioned, so the
    // setup is considered complete regardless of step_progress writes.
    if (isAdminGranted(subscription)) return true;
    const step = stepProgress.find(s => s.step_number === stepNumber);
    return step?.is_completed || false;
  };

  const getStepIcon = (stepNumber: number, title: string) => {
    const isCompleted = getStepStatus(stepNumber);
    const icons: Record<number, any> = {
      1: CreditCard,
      2: Key,
      3: Webhook,
      4: BarChart3,
      5: Users
    };
    
    const Icon = icons[stepNumber] || CheckCircle2;
    
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isCompleted ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              Team Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage your team plan and collaborate with your members
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Plan Status</div>
            <div className="text-lg font-semibold capitalize">
              {subscription?.status || 'trialing'}
            </div>
            {subscription?.current_period_end && (
              <div className="text-xs text-muted-foreground">
                Renews {formatDistanceToNow(new Date(subscription.current_period_end), { addSuffix: true })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/team" className="bg-background border border-border rounded-lg p-4 block hover:border-foreground/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">{teamStats.totalMembers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </Link>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold">{teamStats.activeProjects}</p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">API Keys</p>
              <p className="text-2xl font-bold">{teamStats.apiKeys}</p>
            </div>
            <Key className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Webhooks</p>
              <p className="text-2xl font-bold">{teamStats.webhooks}</p>
            </div>
            <Webhook className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Setup Progress (hidden for admin-granted plans — already fully set up) */}
      {!isAdminGranted(subscription) && (
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Setup Progress</h3>
          <span className="text-sm text-muted-foreground">{isAdminGranted(subscription) ? 100 : completionPercentage}% Complete</span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2 mb-6">
          <div 
            className="bg-success h-2 rounded-full transition-all duration-300"
            style={{ width: `${isAdminGranted(subscription) ? 100 : completionPercentage}%` }}
          />
        </div>

        <div className="space-y-3">
          {[
            { step: 1, title: 'Start Team Trial', description: 'Activate your 14-day trial and set up billing' },
            { step: 2, title: 'Create API Keys', description: 'Generate scoped keys for your services' },
            { step: 3, title: 'Connect Webhooks', description: 'Set up webhook endpoints for real-time events' },
            { step: 4, title: 'Track Analytics', description: 'Monitor your API usage and performance' },
            { step: 5, title: 'Invite Team Members', description: 'Add collaborators to your workspace' }
          ].map(({ step, title, description }) => (
            <div key={step} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              {getStepIcon(step, title)}
              <div className="flex-1">
                <h4 className="font-medium">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              {getStepStatus(step) ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Link 
                  to={`/pricing/team/step/${step}`}
                  className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  Complete <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Quick Actions */}
      <div className="bg-background border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/projects"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <Plus className="w-5 h-5 text-blue-500" />
            <div>
              <div className="font-medium">Create Project</div>
              <div className="text-sm text-muted-foreground">Start a new project</div>
            </div>
          </Link>
          
          <Link 
            to="/keys"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <Key className="w-5 h-5 text-purple-500" />
            <div>
              <div className="font-medium">Generate API Key</div>
              <div className="text-sm text-muted-foreground">Create new credentials</div>
            </div>
          </Link>
          
          <Link 
            to="/webhooks"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <Webhook className="w-5 h-5 text-orange-500" />
            <div>
              <div className="font-medium">Setup Webhook</div>
              <div className="text-sm text-muted-foreground">Configure event endpoints</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Billing Overview */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Billing Overview
          </h3>
          <Link 
            to="/billing"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            View Details
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Current Plan</div>
            <div className="text-lg font-semibold">Team - $15.99/user/month</div>
            <div className="text-sm text-muted-foreground mt-1">
              {teamStats.totalMembers} user{teamStats.totalMembers !== 1 ? 's' : ''} × $15.99
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Monthly Usage</div>
            <div className="text-lg font-semibold">{teamStats.monthlyUsage.toLocaleString()} calls</div>
            <div className="text-sm text-muted-foreground mt-1">
              1,000,000 included
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
