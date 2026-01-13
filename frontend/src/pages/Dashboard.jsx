import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { 
  ShoppingBag, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/performances/overview');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      name: 'Total Commandes',
      value: stats?.totalCommandes || 0,
      icon: ShoppingBag,
      gradient: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/20',
      iconBg: 'bg-blue-500/10',
      trend: '+12%'
    },
    {
      name: 'Commandes Livrées',
      value: stats?.commandesLivrees || 0,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-teal-500',
      shadowColor: 'shadow-emerald-500/20',
      iconBg: 'bg-emerald-500/10',
      trend: '+8%'
    },
    {
      name: 'En Cours',
      value: stats?.commandesEnCours || 0,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-amber-500/20',
      iconBg: 'bg-amber-500/10',
      trend: '+5%'
    },
    {
      name: 'Annulées',
      value: stats?.commandesAnnulees || 0,
      icon: XCircle,
      gradient: 'from-rose-500 to-pink-500',
      shadowColor: 'shadow-rose-500/20',
      iconBg: 'bg-rose-500/10',
      trend: '-3%'
    },
  ];

  const performanceCards = [
    {
      name: 'Taux de Réussite',
      value: `${stats?.tauxReussite || 0}%`,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-fuchsia-500',
      shadowColor: 'shadow-purple-500/20',
      iconBg: 'bg-purple-500/10'
    },
    {
      name: 'Chiffre d\'Affaires',
      value: `${stats?.chiffreAffairesTotal?.toLocaleString('fr-FR') || 0} FCFA`,
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-500',
      shadowColor: 'shadow-green-500/20',
      iconBg: 'bg-green-500/10'
    },
  ];

  const teamStats = [
    { label: 'Appelants', value: stats?.appelants || 0, color: 'from-blue-500 to-cyan-500' },
    { label: 'Stylistes', value: stats?.stylistes || 0, color: 'from-purple-500 to-pink-500' },
    { label: 'Couturiers', value: stats?.couturiers || 0, color: 'from-orange-500 to-red-500' },
    { label: 'Livreurs', value: stats?.livreurs || 0, color: 'from-teal-500 to-green-500' },
  ];

  const quickActions = [
    {
      title: 'Nouvelle Commande',
      description: 'Créer une commande client',
      icon: ShoppingBag,
      href: '/commandes/nouvelle',
      gradient: 'from-blue-500 to-indigo-600',
      roles: ['appelant', 'gestionnaire', 'administrateur']
    },
    {
      title: 'Voir Commandes',
      description: 'Gérer les commandes',
      icon: ShoppingBag,
      href: '/commandes',
      gradient: 'from-indigo-500 to-purple-600',
      roles: ['appelant', 'gestionnaire', 'administrateur']
    },
    {
      title: 'Gérer le Stock',
      description: 'Consulter l\'inventaire',
      icon: Package,
      href: '/stock',
      gradient: 'from-purple-500 to-pink-600',
      roles: ['gestionnaire', 'administrateur']
    },
    {
      title: 'Livraisons',
      description: 'Gérer les livraisons',
      icon: Truck,
      href: '/livraisons',
      gradient: 'from-emerald-500 to-teal-600',
      roles: ['gestionnaire', 'administrateur', 'livreur']
    },
    {
      title: 'Performances',
      description: 'Voir les statistiques',
      icon: BarChart3,
      href: '/performances',
      gradient: 'from-violet-500 to-purple-600',
      roles: ['gestionnaire', 'administrateur']
    },
    {
      title: 'Utilisateurs',
      description: 'Gérer l\'équipe',
      icon: Users,
      href: '/utilisateurs',
      gradient: 'from-cyan-500 to-blue-600',
      roles: ['gestionnaire', 'administrateur']
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in overflow-x-hidden max-w-full">
      {/* En-tête de bienvenue premium */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl shadow-blue-500/30 max-w-full">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 min-w-0">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <Sparkles className="text-yellow-300 flex-shrink-0" size={24} />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white truncate">
              Bienvenue, {user?.nom} !
            </h1>
          </div>
          <p className="text-blue-100 text-sm sm:text-base lg:text-lg font-medium">
            Votre tableau de bord
          </p>
        </div>
      </div>

      {/* Statistiques principales avec glassmorphism */}
      <div className="animate-slide-up max-w-full">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center space-x-2 sm:space-x-3">
          <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full flex-shrink-0"></div>
          <span className="truncate">Statistiques des Commandes</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-full">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.name} 
                className="stat-card group cursor-pointer max-w-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                  <div className={`${stat.iconBg} p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-transform duration-300 group-hover:scale-110 flex-shrink-0`}>
                    <Icon className={`bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} size={24} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
                    {stat.trend}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-gray-500 mb-1.5 sm:mb-2 uppercase tracking-wide truncate">{stat.name}</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 mb-1">{stat.value}</p>
                <div className={`h-1 w-full bg-gradient-to-r ${stat.gradient} rounded-full opacity-20 mt-3 sm:mt-4`}></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance globale - Visible uniquement pour Admin et Gestionnaire */}
      {(user?.role === 'administrateur' || user?.role === 'gestionnaire') && (
      <div className="animate-slide-up max-w-full" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center space-x-2 sm:space-x-3">
          <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full flex-shrink-0"></div>
          <span className="truncate">Performance Globale</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 max-w-full">
          {performanceCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.name} 
                className="stat-card group cursor-pointer max-w-full overflow-hidden"
                style={{ animationDelay: `${(index + 4) * 0.1}s` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-500 mb-2 sm:mb-3 uppercase tracking-wide truncate">{stat.name}</p>
                    <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 mb-1.5 sm:mb-2 break-all">{stat.value}</p>
                    <div className={`h-1.5 sm:h-2 w-full bg-gradient-to-r ${stat.gradient} rounded-full`}></div>
                  </div>
                  <div className={`${stat.iconBg} p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl transition-transform duration-300 group-hover:scale-110 flex-shrink-0`}>
                    <Icon className={`bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} size={32} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Équipe active - Visible uniquement pour Admin et Gestionnaire */}
      {(user?.role === 'administrateur' || user?.role === 'gestionnaire') && (
      <div className="stat-card animate-slide-up max-w-full overflow-hidden" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center space-x-2 sm:space-x-3 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0">
            <Users className="text-white" size={24} />
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
            Équipe Active
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-full">
          {teamStats.map((item, index) => (
            <div 
              key={item.label} 
              className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-gray-100 group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-w-0"
              style={{ animationDelay: `${(index + 6) * 0.1}s` }}
            >
              <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-2xl"></div>
              <p className={`text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-br ${item.color} bg-clip-text text-transparent mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                {item.value}
              </p>
              <p className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider truncate">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Accès rapides premium */}
      <div className="animate-slide-up max-w-full" style={{ animationDelay: '0.4s' }}>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center space-x-2 sm:space-x-3">
          <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full flex-shrink-0"></div>
          <span className="truncate">Accès Rapides</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-full">
          {quickActions
            .filter(action => action.roles.includes(user?.role))
            .map((action, index) => {
              const Icon = action.icon;
              return (
                <a 
                  key={action.title}
                  href={action.href} 
                  className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 max-w-full"
                  style={{ animationDelay: `${(index + 10) * 0.1}s` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  <div className="relative z-10 min-w-0">
                    <div className={`bg-gradient-to-br ${action.gradient} p-3 sm:p-4 rounded-xl sm:rounded-2xl inline-block mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="text-white" size={28} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors truncate">
                      {action.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 font-medium mb-3 sm:mb-4 line-clamp-2">
                      {action.description}
                    </p>
                    <div className="flex items-center text-blue-600 font-bold group-hover:translate-x-2 transition-transform duration-300">
                      <span className="text-sm sm:text-base">Accéder</span>
                      <ArrowUpRight size={16} className="ml-2 flex-shrink-0" />
                    </div>
                  </div>
                </a>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
