import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { LogIn, Loader, Sparkles, Lock, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        toast.success('Connexion réussie !', {
          icon: '🎉',
          style: {
            borderRadius: '16px',
            background: '#10b981',
            color: '#fff',
          },
        });
        navigate('/dashboard');
      } else {
        toast.error(result.message || 'Erreur de connexion', {
          style: {
            borderRadius: '16px',
            background: '#ef4444',
            color: '#fff',
          },
        });
      }
    } catch (error) {
      toast.error('Une erreur est survenue', {
        style: {
          borderRadius: '16px',
          background: '#ef4444',
          color: '#fff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const demoAccounts = [
    { role: 'Admin', email: 'admin@atelier.com', gradient: 'from-blue-600 to-indigo-600' },
    { role: 'Appelant', email: 'appelant@atelier.com', gradient: 'from-purple-600 to-pink-600' },
    { role: 'Styliste', email: 'styliste@atelier.com', gradient: 'from-orange-600 to-red-600' },
    { role: 'Livreur', email: 'livreur@atelier.com', gradient: 'from-teal-600 to-green-600' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
      
      {/* Orbes flottants */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Colonne gauche - Branding */}
        <div className="hidden lg:block space-y-8 animate-slide-up">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl shadow-blue-500/30 animate-pulse-glow">
              <Sparkles className="text-white" size={40} strokeWidth={2.5} />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-6xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                Atelier de Confection
              </h1>
              <p className="text-2xl text-gray-600 font-semibold">
                Gestion professionnelle de votre entreprise
              </p>
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
                <span className="font-medium">Version 2026</span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4 pt-8">
              {[
                { icon: '📦', text: 'Gestion des commandes en temps réel' },
                { icon: '✂️', text: 'Suivi de production atelier' },
                { icon: '🚚', text: 'Livraisons optimisées' },
                { icon: '📊', text: 'Analytics & Performances' }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-x-2"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="text-3xl">{feature.icon}</span>
                  <span className="font-semibold text-gray-700">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite - Formulaire de connexion */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/40 p-10 space-y-8">
            {/* En-tête mobile */}
            <div className="lg:hidden text-center space-y-4 mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/30 mx-auto">
                <Sparkles className="text-white" size={32} />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Atelier de Confection
              </h2>
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-black text-gray-900">
                Bienvenue ! 👋
              </h3>
              <p className="text-gray-600 font-medium">
                Connectez-vous pour accéder à votre espace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Adresse email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="input pl-12 focus-ring"
                    placeholder="exemple@email.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input pl-12 focus-ring"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary btn-lg group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center space-x-3">
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={24} />
                      <span className="font-bold">Connexion...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={24} strokeWidth={2.5} />
                      <span className="font-bold">Se connecter</span>
                      <ArrowRight size={24} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Comptes de démonstration */}
            <div className="space-y-4 pt-6 border-t border-gray-200/60">
              <p className="text-xs font-bold text-gray-500 text-center uppercase tracking-wider">
                Comptes de démonstration
              </p>
              <div className="grid grid-cols-2 gap-3">
                {demoAccounts.map((account, index) => (
                  <button
                    key={index}
                    onClick={() => setFormData({ email: account.email, password: 'admin123' })}
                    className="group relative overflow-hidden bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    disabled={loading}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${account.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    <div className="relative z-10 space-y-1">
                      <p className={`font-bold text-sm bg-gradient-to-r ${account.gradient} bg-clip-text text-transparent`}>
                        {account.role}
                      </p>
                      <p className="text-xs text-gray-500 font-medium truncate">
                        {account.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-center text-gray-400 font-medium">
                Mot de passe : <span className="font-bold text-gray-600">admin123</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6 font-medium">
            © 2026 Atelier de Confection. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
