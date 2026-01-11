import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Package, 
  Scissors, 
  Shirt, 
  Truck, 
  BarChart3, 
  Users, 
  LogOut,
  Menu,
  X,
  ShoppingBag,
  Sparkles,
  Bell,
  Settings,
  Palette,
  PhoneCall
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, roles: ['administrateur', 'gestionnaire', 'appelant', 'styliste', 'couturier', 'livreur'], gradient: 'from-blue-500 to-cyan-500' },
    { name: 'Appel', href: '/appel', icon: PhoneCall, roles: ['administrateur', 'gestionnaire', 'appelant'], gradient: 'from-orange-500 to-red-500' },
    { name: 'Commandes', href: '/commandes', icon: ShoppingBag, roles: ['administrateur', 'gestionnaire', 'appelant'], gradient: 'from-purple-500 to-pink-500' },
    { name: 'Bibliothèque Modèles', href: '/modeles', icon: Palette, roles: ['administrateur', 'gestionnaire'], gradient: 'from-fuchsia-500 to-pink-500' },
    { name: 'Stock', href: '/stock', icon: Package, roles: ['administrateur', 'gestionnaire'], gradient: 'from-emerald-500 to-teal-500' },
    { name: 'Atelier - Styliste', href: '/atelier/styliste', icon: Scissors, roles: ['administrateur', 'gestionnaire', 'styliste'], gradient: 'from-amber-500 to-orange-500' },
    { name: 'Atelier - Couturier', href: '/atelier/couturier', icon: Shirt, roles: ['administrateur', 'gestionnaire', 'couturier'], gradient: 'from-rose-500 to-red-500' },
    { name: 'Livraisons', href: '/livraisons', icon: Truck, roles: ['administrateur', 'gestionnaire', 'livreur'], gradient: 'from-indigo-500 to-blue-500' },
    { name: 'Performances', href: '/performances', icon: BarChart3, roles: ['administrateur', 'gestionnaire'], gradient: 'from-violet-500 to-purple-500' },
    { name: 'Utilisateurs', href: '/utilisateurs', icon: Users, roles: ['administrateur', 'gestionnaire'], gradient: 'from-cyan-500 to-blue-500' },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  const getRoleGradient = (role) => {
    const gradients = {
      administrateur: 'from-purple-500 to-pink-600',
      gestionnaire: 'from-blue-500 to-indigo-600',
      appelant: 'from-green-500 to-emerald-600',
      styliste: 'from-amber-500 to-orange-600',
      couturier: 'from-orange-500 to-red-600',
      livreur: 'from-teal-500 to-cyan-600',
    };
    return gradients[role] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar premium avec glassmorphism */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-screen w-72
          bg-white/80 backdrop-blur-2xl border-r border-white/40
          shadow-2xl shadow-black/10
          transform transition-all duration-500 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo premium */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/60">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center">
                  <Sparkles className="text-white" size={24} strokeWidth={2.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Atelier
                </h1>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Confection
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Info premium */}
          <div className="p-4 m-4 bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className={`relative w-14 h-14 bg-gradient-to-br ${getRoleGradient(user?.role)} rounded-2xl flex items-center justify-center shadow-lg`}>
                <span className="text-white font-black text-xl">
                  {user?.nom?.charAt(0).toUpperCase()}
                </span>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user?.nom}
                </p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRoleGradient(user?.role)} text-white shadow-sm`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation premium */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group relative flex items-center space-x-3 px-4 py-3.5 rounded-xl 
                    transition-all duration-300 overflow-hidden
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/20 scale-105' 
                      : 'hover:bg-white/60 hover:shadow-md hover:-translate-x-1'
                    }
                  `}
                >
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-10`}></div>
                  )}
                  <div className={`
                    relative z-10 p-2 rounded-xl transition-all duration-300
                    ${isActive 
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg` 
                      : 'bg-gray-100 group-hover:bg-gradient-to-br group-hover:' + item.gradient
                    }
                  `}>
                    <Icon 
                      size={20} 
                      className={isActive ? 'text-white' : 'text-gray-600 group-hover:text-white'} 
                      strokeWidth={2.5}
                    />
                  </div>
                  <span className={`
                    relative z-10 text-sm font-bold transition-colors
                    ${isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}
                  `}>
                    {item.name}
                  </span>
                  {isActive && (
                    <div className="absolute right-4 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout premium */}
          <div className="p-4 border-t border-gray-200/60">
            <button
              onClick={logout}
              className="group flex items-center space-x-3 w-full px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <LogOut size={20} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Bar premium */}
        <header className="bg-white/80 backdrop-blur-2xl border-b border-white/40 sticky top-0 z-30 shadow-lg shadow-black/5">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
              >
                <Menu size={24} strokeWidth={2.5} />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="hidden lg:block w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                <h2 className="text-2xl font-black text-gray-900">
                  {filteredNavigation.find(item => item.href === location.pathname)?.name || 'Tableau de bord'}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Date */}
              <div className="hidden md:block px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/60">
                <p className="text-sm font-bold text-gray-700">
                  {new Date().toLocaleDateString('fr-FR', { 
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {/* Actions */}
              <button className="relative p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-all hover:scale-110">
                <Bell size={22} strokeWidth={2.5} />
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </button>
              
              <button className="p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-all hover:scale-110">
                <Settings size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
