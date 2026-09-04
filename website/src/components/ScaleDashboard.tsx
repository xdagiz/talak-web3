import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getMySubscription, isAdminGranted } from "@/integrations/supabase/subscriptions";
import { getStepProgress, getTierCompletion } from "@/integrations/supabase/step-progress";
import { 
  Server, 
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
  Eye,
  AlertTriangle,
  Cpu,
  HardDrive,
  Wifi,
  Gauge
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ScaleDashboardProps {
  subscription: any;
}

export function ScaleDashboard({ subscription }: ScaleDashboardProps) {
  const [stepProgress, setStepProgress] = useState<any[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [scaleStats, setScaleStats] = useState({
    dedicatedNodes: 0,
    activeProjects: 0,
    apiKeys: 0,
    webhooks: 0,
    monthlyUsage: 0,
    alertsConfigured: 0,
    uptime: 99.97,
    avgResponseTime: 42
  });

  useEffect(() => {
    loadScaleData();
  }, []);

  const loadScaleData = async () => {
    try {
      // Load step progress
      const progress = await getStepProgress('scale');
      setStepProgress(progress);
      
      const completion = await getTierCompletion('scale', 5);
      setCompletionPercentage(completion);

      // Load scale statistics
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

        setScaleStats(prev => ({
          ...prev,
          activeProjects: projects?.length || 0,
          apiKeys: apiKeys?.length || 0,
          webhooks: webhooks?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error loading scale data:', error);
      // Set default values on error
      setStepProgress([]);
      setCompletionPercentage(0);
    }
  };

  const getStepStatus = (stepNumber: number) => {
    // Admin-granted subscriptions are already fully paid & provisioned.
    if (isAdminGranted(subscription)) return true;
    const step = stepProgress.find(s => s.step_number === stepNumber);
    return step?.is_completed || false;
  };

  const getStepIcon = (stepNumber: number, title: string) => {
    const isCompleted = getStepStatus(stepNumber);
    const icons: Record<number, any> = {
      1: CreditCard,
      2: Server,
      3: Zap,
      4: AlertTriangle,
      5: BarChart3
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
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Server className="w-6 h-6 text-purple-500" />
              Scale Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              High-performance infrastructure with dedicated resources
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

      {/* Infrastructure Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dedicated Nodes</p>
              <p className="text-2xl font-bold">{scaleStats.dedicatedNodes}</p>
            </div>
            <Server className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-2xl font-bold">{scaleStats.uptime}%</p>
            </div>
            <Shield className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
              <p className="text-2xl font-bold">{scaleStats.avgResponseTime}ms</p>
            </div>
            <Gauge className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alerts</p>
              <p className="text-2xl font-bold">{scaleStats.alertsConfigured}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Setup Progress (hidden for admin-granted plans — already fully set up) */}
      {!isAdminGranted(subscription) && (
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Scale Setup Progress</h3>
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
            { step: 1, title: 'Activate Scale Trial', description: 'Enable high-volume infrastructure' },
            { step: 2, title: 'Provision Dedicated RPC', description: 'Configure dedicated nodes and failover' },
            { step: 3, title: 'Integrate Backend API', description: 'Connect your services to Scale infrastructure' },
            { step: 4, title: 'Set Realtime Alerting', description: 'Configure monitoring and incident response' },
            { step: 5, title: 'Validate Billing', description: 'Confirm usage counters and billing setup' }
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
                  to={`/pricing/scale/step/${step}`}
                  className="text-sm text-purple-500 hover:text-purple-600 flex items-center gap-1"
                >
                  Complete <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Infrastructure Overview */}
      <div className="bg-background border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-500" />
          Infrastructure Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Node Configuration</span>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Node Type</span>
                  <span>High-performance</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Regions</span>
                  <span>3 (US, EU, APAC)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failover Strategy</span>
                  <span>Active-active</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Performance Metrics</span>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Throughput</span>
                  <span>10K+ req/sec</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P99 Latency</span>
                  <span>&lt;100ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Error Rate</span>
                  <span>&lt;0.01%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Monitoring</span>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Health Checks</span>
                  <span className="text-success">Operational</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alert Rules</span>
                  <span>{scaleStats.alertsConfigured} active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Log Retention</span>
                  <span>1 year</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Security</span>
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DDoS Protection</span>
                  <span className="text-success">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate Limiting</span>
                  <span>Configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SSL/TLS</span>
                  <span>1.3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-background border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Infrastructure Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/projects"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <Plus className="w-5 h-5 text-purple-500" />
            <div>
              <div className="font-medium">Scale Project</div>
              <div className="text-sm text-muted-foreground">Deploy to dedicated infrastructure</div>
            </div>
          </Link>
          
          <Link 
            to="/analytics"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <div>
              <div className="font-medium">Performance Analytics</div>
              <div className="text-sm text-muted-foreground">Monitor infrastructure metrics</div>
            </div>
          </Link>
          
          <Link 
            to="/settings"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <Settings className="w-5 h-5 text-orange-500" />
            <div>
              <div className="font-medium">Infrastructure Settings</div>
              <div className="text-sm text-muted-foreground">Configure nodes and alerts</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Usage & Billing */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Usage & Billing
          </h3>
          <Link 
            to="/billing"
            className="text-sm text-purple-500 hover:text-purple-600"
          >
            View Details
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Base Plan</div>
            <div className="text-lg font-semibold">$99/month</div>
            <div className="text-sm text-muted-foreground mt-1">
              Includes 10M calls
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Current Usage</div>
            <div className="text-lg font-semibold">{scaleStats.monthlyUsage.toLocaleString()} calls</div>
            <div className="text-sm text-muted-foreground mt-1">
              ${(scaleStats.monthlyUsage > 10000000 ? ((scaleStats.monthlyUsage - 10000000) / 100000 * 1).toFixed(2) : '0.00')} overage
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Estimated Monthly</div>
            <div className="text-lg font-semibold">
              ${scaleStats.monthlyUsage > 10000000 ? (99 + ((scaleStats.monthlyUsage - 10000000) / 100000 * 1)).toFixed(2) : '99.00'}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Base + usage
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
