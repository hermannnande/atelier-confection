import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Eye,
  LockKeyhole,
  Package,
  PackageOpen,
  Plus,
  Save,
  Search,
  Truck,
  X,
} from 'lucide-react';

const Stock = () => {
  const [stock, setStock] = useState([]);
  const [stockTotals, setStockTotals] = useState({});
  const [modeles, setModeles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [detailSearchTerm, setDetailSearchTerm] = useState('');
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedModeleDetails, setSelectedModeleDetails] = useState(null);
  const [selectedModele, setSelectedModele] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedVariations, setEditedVariations] = useState([]);
  
  // État pour les tailles/couleurs personnalisées
  const [customTailles, setCustomTailles] = useState([]);
  const [customCouleurs, setCustomCouleurs] = useState([]);
  const [newTaille, setNewTaille] = useState('');
  const [newCouleur, setNewCouleur] = useState('');

  // Mode bicolore (2 tons)
  const [modeBicolore, setModeBicolore] = useState(false);
  const [bicolore1, setBicolore1] = useState('');
  const [bicolore2, setBicolore2] = useState('');
  
  // Suggestions
  const taillesSuggestions = ['Standard', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL'];
  const couleursSuggestions = [
    'Blanc',
    'Noir',
    'Rouge',
    'Rouge Bordeaux',
    'Bleu',
    'Bleu ciel',
    'Bleu bic',
    'Vert',
    'Vert Treillis',
    'Jaune',
    'Jaune Moutarde',
    'Rose',
    'Saumon',
    'Violet',
    'Violet clair',
    'Orange',
    'Grise',
    'Beige',
    'Marron',
    'Terracotta',
    'Kaki',
    'Multicolore'
  ];

  const addBicolore = () => {
    if (bicolore1 && bicolore2 && bicolore1 !== bicolore2) {
      const combined = `${bicolore1} / ${bicolore2}`;
      addCouleur(combined);
      setBicolore1('');
      setBicolore2('');
    }
  };

  const [variations, setVariations] = useState([]);

  useEffect(() => {
    fetchStock();
    fetchModeles();
  }, []);

  const fetchStock = async () => {
    try {
      const response = await api.get('/stock/suivi-commandes');
      setStock(response.data.stock || []);
      setStockTotals(response.data.totaux || {});
    } catch (error) {
      toast.error('Erreur lors du chargement du stock');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModeles = async () => {
    try {
      const response = await api.get('/modeles');
      setModeles(response.data.modeles || []);
    } catch (error) {
      console.error('Erreur chargement modèles:', error);
    }
  };

  // Grouper le stock par modèle
  const groupedStock = stock.reduce((acc, item) => {
    const key = item.modele;
    if (!acc[key]) {
      // Chercher l'image depuis la bibliothèque de modèles si elle n'existe pas dans le stock
      let imageUrl = item.image;
      if (!imageUrl) {
        const modeleCorrespondant = modeles.find(m => m.nom === key);
        imageUrl = modeleCorrespondant?.image || null;
      }
      
      acc[key] = {
        modele: key,
        image: imageUrl,
        variations: [],
        quantiteTotal: 0,
        quantiteReservee: 0,
        quantiteDisponible: 0,
        quantiteLivraison: 0,
        valeurTotal: 0,
        taillesUniques: new Set(),
        couleursUniques: new Set()
      };
    }
    acc[key].variations.push(item);
    acc[key].quantiteTotal += item.quantitePrincipale || item.quantite || 0;
    acc[key].quantiteReservee += item.quantiteReservee || 0;
    acc[key].quantiteDisponible += item.quantiteDisponible || 0;
    acc[key].quantiteLivraison += item.quantiteEnLivraison || 0;
    acc[key].valeurTotal += (item.quantitePrincipale || item.quantite || 0) * item.prix;
    acc[key].taillesUniques.add(item.taille);
    acc[key].couleursUniques.add(item.couleur);
    return acc;
  }, {});

  const allStockGroups = Object.values(groupedStock)
    .map(item => ({
      ...item,
      taillesUniques: Array.from(item.taillesUniques),
      couleursUniques: Array.from(item.couleursUniques),
      variations: [...item.variations].sort((a, b) => (
        (b.quantiteReservee || 0) - (a.quantiteReservee || 0)
        || (b.quantiteDisponible || 0) - (a.quantiteDisponible || 0)
        || String(a.couleur || '').localeCompare(String(b.couleur || ''), 'fr')
      )),
    }))
    .sort((a, b) => (
      Number(b.quantiteReservee > 0) - Number(a.quantiteReservee > 0)
      || Number(b.quantiteDisponible <= 2 && b.quantiteTotal > 0) - Number(a.quantiteDisponible <= 2 && a.quantiteTotal > 0)
      || b.quantiteDisponible - a.quantiteDisponible
      || a.modele.localeCompare(b.modele, 'fr', { numeric: true })
    ));

  const filterCounts = {
    all: allStockGroups.length,
    available: allStockGroups.filter(item => item.quantiteDisponible > 0).length,
    reserved: allStockGroups.filter(item => item.quantiteReservee > 0).length,
    low: allStockGroups.filter(item => item.quantiteTotal > 0 && item.quantiteDisponible <= 2).length,
    empty: allStockGroups.filter(item => item.quantiteTotal === 0).length,
  };
  const modelesEnStock = allStockGroups.filter(item => item.quantiteTotal > 0).length;

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('fr');
  const stockGroupe = allStockGroups.filter((item) => {
    const matchesSearch = !normalizedSearch
      || item.modele.toLocaleLowerCase('fr').includes(normalizedSearch)
      || item.variations.some((variation) => (
        String(variation.taille || '').toLocaleLowerCase('fr').includes(normalizedSearch)
        || String(variation.couleur || '').toLocaleLowerCase('fr').includes(normalizedSearch)
      ));
    if (!matchesSearch) return false;

    if (stockFilter === 'available') return item.quantiteDisponible > 0;
    if (stockFilter === 'reserved') return item.quantiteReservee > 0;
    if (stockFilter === 'low') return item.quantiteTotal > 0 && item.quantiteDisponible <= 2;
    if (stockFilter === 'empty') return item.quantiteTotal === 0;
    return true;
  });

  const handleModeleSelect = (modele) => {
    setSelectedModele(modele);
    setCustomTailles([]);
    setCustomCouleurs([]);
    setVariations([]);
  };

  const handleViewDetails = (modeleGroup) => {
    setSelectedModeleDetails(modeleGroup);
    setDetailSearchTerm('');
    setEditedVariations(modeleGroup.variations.map(v => ({
      ...v,
      quantitePrincipale: v.quantitePrincipale || v.quantite || 0,
      prix: v.prix
    })));
    setEditMode(false);
    setShowDetailsModal(true);
  };

  const handleEditVariation = (index, field, value) => {
    setEditedVariations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveChanges = async () => {
    try {
      let successCount = 0;
      
      for (const variation of editedVariations) {
        try {
          // Conserver TOUTES les données importantes, y compris l'image
          await api.put(`/stock/${variation._id || variation.id}`, {
            quantite: variation.quantitePrincipale,
            prix: variation.prix,
            modele: variation.modele,
            taille: variation.taille,
            couleur: variation.couleur,
            image: variation.image || selectedModeleDetails.image // Conserver l'image
          });
          successCount++;
        } catch (error) {
          console.error(`Erreur pour ${variation.taille} × ${variation.couleur}:`, error);
        }
      }
      
      toast.success(`${successCount} variation(s) mise(s) à jour !`);
      setEditMode(false);
      fetchStock();
      
      // Mettre à jour les données du modal
      const refreshedVariations = editedVariations.map((variation) => ({
        ...variation,
        quantiteReservee: Math.min(
          variation.quantitePrincipale,
          variation.quantiteReservee || 0,
        ),
        quantiteDisponible: Math.max(
          variation.quantitePrincipale - (variation.quantiteReservee || 0),
          0,
        ),
      }));
      const updatedGroup = {
        ...selectedModeleDetails,
        variations: refreshedVariations,
        quantiteTotal: editedVariations.reduce((sum, v) => sum + v.quantitePrincipale, 0),
        quantiteReservee: refreshedVariations.reduce((sum, v) => sum + v.quantiteReservee, 0),
        quantiteDisponible: refreshedVariations.reduce((sum, v) => sum + v.quantiteDisponible, 0),
        valeurTotal: editedVariations.reduce((sum, v) => sum + (v.quantitePrincipale * v.prix), 0)
      };
      setSelectedModeleDetails(updatedGroup);
      
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const addTaille = (taille) => {
    if (taille && !customTailles.includes(taille)) {
      setCustomTailles([...customTailles, taille]);
      generateVariations([...customTailles, taille], customCouleurs);
    }
  };

  const addCouleur = (couleur) => {
    if (couleur && !customCouleurs.includes(couleur)) {
      setCustomCouleurs([...customCouleurs, couleur]);
      generateVariations(customTailles, [...customCouleurs, couleur]);
    }
  };

  const removeTaille = (taille) => {
    const newTailles = customTailles.filter(t => t !== taille);
    setCustomTailles(newTailles);
    generateVariations(newTailles, customCouleurs);
  };

  const removeCouleur = (couleur) => {
    const newCouleurs = customCouleurs.filter(c => c !== couleur);
    setCustomCouleurs(newCouleurs);
    generateVariations(customTailles, newCouleurs);
  };

  const generateVariations = (tailles, couleurs) => {
    const newVariations = [];
    tailles.forEach(taille => {
      couleurs.forEach(couleur => {
        const existing = variations.find(v => v.taille === taille && v.couleur === couleur);
        newVariations.push({
          taille,
          couleur,
          quantite: existing?.quantite || 0,
          prix: existing?.prix || selectedModele?.prixBase || selectedModele?.prix_base || 0
        });
      });
    });
    setVariations(newVariations);
  };

  const updateVariation = (index, field, value) => {
    setVariations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitVariations = async () => {
    try {
      if (customTailles.length === 0 || customCouleurs.length === 0) {
        toast.error('Ajoutez au moins 1 taille et 1 couleur');
        return;
      }

      const validVariations = variations.filter(v => v.quantite > 0);
      
      if (validVariations.length === 0) {
        toast.error('Ajoutez au moins une variation avec une quantité');
        return;
      }

      for (const variation of validVariations) {
        await api.post('/stock', {
          modele: selectedModele.nom,
          taille: variation.taille,
          couleur: variation.couleur,
          quantite: variation.quantite,
          prix: variation.prix,
          image: selectedModele.image
        });
      }

      toast.success(`${validVariations.length} variation(s) ajoutée(s) au stock !`);
      setShowModal(false);
      setSelectedModele(null);
      setCustomTailles([]);
      setCustomCouleurs([]);
      setVariations([]);
      fetchStock();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const detailVariations = showDetailsModal && selectedModeleDetails
    ? (editMode ? editedVariations : selectedModeleDetails.variations)
    : [];
  const normalizedDetailSearch = detailSearchTerm.trim().toLocaleLowerCase('fr');
  const detailRows = detailVariations
    .map((variation, index) => ({ variation, index }))
    .filter(({ variation }) => (
      !normalizedDetailSearch
      || String(variation.taille || '').toLocaleLowerCase('fr').includes(normalizedDetailSearch)
      || String(variation.couleur || '').toLocaleLowerCase('fr').includes(normalizedDetailSearch)
    ));

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

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 overflow-x-hidden px-1 animate-fade-in sm:space-y-5 sm:px-3">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 p-4 text-white shadow-xl sm:rounded-3xl sm:p-6">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-20 h-48 w-48 rounded-full bg-cyan-300/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20 backdrop-blur-sm">
              <Boxes size={30} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">Inventaire synchronisé</p>
              <h1 className="truncate text-2xl font-black sm:text-3xl">Gestion du stock</h1>
              <p className="mt-0.5 text-xs text-emerald-50/90 sm:text-sm">
                {allStockGroups.length} modèles · mise à jour avec les commandes en cours
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-emerald-800 shadow-lg transition hover:bg-emerald-50 active:scale-[0.98] sm:w-auto"
          >
            <Plus size={18} strokeWidth={3} />
            Ajouter des pièces
          </button>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-white/90 sm:text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">Physique = pièces présentes</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">Réservé = commandes en cours</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">Disponible = pièces encore libres</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-5 sm:gap-3">
        {[
          { name: 'Stock physique', value: stockTotals.stockPhysique || 0, icon: Package, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
          { name: 'Réservé', value: stockTotals.quantiteReservee || 0, icon: LockKeyhole, tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
          { name: 'Disponible', value: stockTotals.quantiteDisponible || 0, icon: CheckCircle2, tone: 'bg-cyan-50 text-cyan-700 ring-cyan-100' },
          { name: 'En livraison', value: stockTotals.enLivraison || 0, icon: Truck, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
          { name: 'Modèles en stock', value: modelesEnStock, icon: Boxes, tone: 'bg-violet-50 text-violet-700 ring-violet-100', wide: true },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className={`rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-200/80 sm:p-4 ${stat.wide ? 'col-span-2 lg:col-span-1' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-wide text-gray-500 sm:text-xs">{stat.name}</p>
                  <p className="mt-1 truncate text-xl font-black text-gray-950 sm:text-2xl">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 ${stat.tone}`}>
                  <Icon size={19} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-200/80 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input !rounded-xl !py-2.5 pl-10 pr-9 text-sm"
              placeholder="Modèle, couleur ou taille…"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Effacer la recherche"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: 'Tous', count: filterCounts.all },
              { id: 'available', label: 'Disponibles', count: filterCounts.available },
              { id: 'reserved', label: 'Réservés', count: filterCounts.reserved },
              { id: 'low', label: 'Faibles', count: filterCounts.low },
              { id: 'empty', label: 'Vides', count: filterCounts.empty },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStockFilter(filter.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black transition-colors sm:text-sm ${
                  stockFilter === filter.id
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-gray-500 sm:text-xs">
          <span>{stockGroupe.length} modèle(s) affiché(s)</span>
          {filterCounts.low > 0 && (
            <button type="button" onClick={() => setStockFilter('low')} className="inline-flex items-center gap-1 font-bold text-amber-700 hover:text-amber-900">
              <AlertTriangle size={13} /> {filterCounts.low} à surveiller
            </button>
          )}
        </div>
      </section>

      {stockGroupe.length === 0 ? (
        <section className="rounded-2xl bg-white px-4 py-12 text-center shadow-sm ring-1 ring-gray-200/80">
          <PackageOpen className="mx-auto text-gray-300" size={46} />
          <h2 className="mt-3 text-lg font-black text-gray-900">Aucun modèle trouvé</h2>
          <p className="mt-1 text-sm text-gray-500">Modifiez la recherche ou choisissez un autre filtre.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {stockGroupe.map((item) => {
            const usefulVariations = item.variations.filter((variation) => (
              (variation.quantitePrincipale || variation.quantite || 0) > 0
              || (variation.quantiteReservee || 0) > 0
              || (variation.quantiteEnLivraison || 0) > 0
            ));
            const previewVariations = (usefulVariations.length > 0 ? usefulVariations : item.variations).slice(0, 4);
            const hiddenCount = item.variations.length - previewVariations.length;
            const usagePercent = item.quantiteTotal > 0
              ? Math.min(100, Math.round((item.quantiteReservee / item.quantiteTotal) * 100))
              : 0;
            const status = item.quantiteTotal === 0
              ? { label: 'Stock vide', className: 'bg-gray-100 text-gray-600' }
              : item.quantiteDisponible === 0
                ? { label: 'Entièrement réservé', className: 'bg-amber-100 text-amber-800' }
                : item.quantiteReservee > 0
                  ? { label: 'Réservations actives', className: 'bg-indigo-100 text-indigo-700' }
                  : { label: 'Disponible', className: 'bg-emerald-100 text-emerald-700' };

            return (
              <button
                key={item.modele}
                type="button"
                onClick={() => handleViewDetails(item)}
                className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-gray-200/90 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-emerald-300"
              >
                <div className="flex items-center gap-3 border-b border-gray-100 p-3.5">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-cyan-100 ring-1 ring-gray-200">
                    {item.image ? (
                      <img src={item.image} alt={item.modele} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="text-emerald-500" size={26} /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-base font-black leading-tight text-gray-950 sm:text-lg">{item.modele}</h2>
                      <ChevronRight className="mt-0.5 flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" size={19} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${status.className}`}>{status.label}</span>
                      <span className="text-[10px] font-bold text-gray-400">{item.variations.length} variation(s)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px bg-gray-100">
                  {[
                    { label: 'Physique', value: item.quantiteTotal, color: 'text-emerald-700' },
                    { label: 'Réservé', value: item.quantiteReservee, color: 'text-indigo-700' },
                    { label: 'Disponible', value: item.quantiteDisponible, color: item.quantiteDisponible <= 2 ? 'text-red-600' : 'text-cyan-700' },
                  ].map((metric) => (
                    <div key={metric.label} className="bg-white px-2 py-2.5 text-center">
                      <p className={`text-xl font-black ${metric.color}`}>{metric.value}</p>
                      <p className="text-[9px] font-black uppercase tracking-wide text-gray-400 sm:text-[10px]">{metric.label}</p>
                    </div>
                  ))}
                </div>

                {item.quantiteTotal > 0 && (
                  <div className="px-3.5 pt-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                      <span>Occupation du stock</span><span>{usagePercent}% réservé</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${usagePercent}%` }} />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 p-3.5">
                  {previewVariations.map((variation) => {
                    const physical = variation.quantitePrincipale || variation.quantite || 0;
                    return (
                      <div key={variation._id || variation.id || `${variation.taille}-${variation.couleur}`} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-2">
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-800">
                          {variation.couleur} · {variation.taille}
                        </span>
                        <span className="whitespace-nowrap text-[10px] font-bold text-gray-500">
                          P <b className="text-emerald-700">{physical}</b> · R <b className="text-indigo-700">{variation.quantiteReservee || 0}</b> · D <b className="text-cyan-700">{variation.quantiteDisponible || 0}</b>
                        </span>
                      </div>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <p className="pt-0.5 text-center text-[11px] font-bold text-gray-400">+ {hiddenCount} autre(s) variation(s)</p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 px-3.5 py-2.5">
                  <span className="text-[11px] font-bold text-gray-500">
                    Nombre en stock : <b className="text-emerald-700">{item.quantiteTotal}</b>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700"><Eye size={14} /> Détails</span>
                </div>
              </button>
            );
          })}
        </section>
      )}

      {/* Modal Détails Modèle */}
      {showDetailsModal && selectedModeleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm animate-fade-in sm:p-4">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-gray-50 shadow-2xl animate-scale-in sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-700 p-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/20">
                  {selectedModeleDetails.image ? (
                    <img src={selectedModeleDetails.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><Package size={22} className="text-white" /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-white sm:text-2xl">{selectedModeleDetails.modele}</h2>
                  <p className="text-xs text-white/80 sm:text-sm">{selectedModeleDetails.variations.length} variations</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedModeleDetails(null);
                }}
                className="rounded-xl p-2 text-white transition-all hover:bg-white/20"
                aria-label="Fermer"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4 p-3 sm:p-5">
              {/* Stats résumé */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 sm:p-4">
                  <p className="text-[9px] font-black uppercase text-gray-500 sm:text-xs">Physique</p>
                  <p className="mt-1 text-2xl font-black text-emerald-700 sm:text-3xl">
                    {editMode 
                      ? editedVariations.reduce((sum, v) => sum + v.quantitePrincipale, 0)
                      : selectedModeleDetails.quantiteTotal
                    }
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 sm:p-4">
                  <p className="text-[9px] font-black uppercase text-gray-500 sm:text-xs">Réservé</p>
                  <p className="mt-1 text-2xl font-black text-indigo-700 sm:text-3xl">{selectedModeleDetails.quantiteReservee}</p>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-2.5 sm:p-4">
                  <p className="text-[9px] font-black uppercase text-gray-500 sm:text-xs">Disponible</p>
                  <p className="mt-1 text-2xl font-black text-cyan-700 sm:text-3xl">
                    {editMode
                      ? editedVariations.reduce((sum, v) => sum + Math.max(v.quantitePrincipale - (v.quantiteReservee || 0), 0), 0)
                      : selectedModeleDetails.quantiteDisponible
                    }
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                <span className="inline-flex items-center gap-1.5"><Truck size={14} className="text-amber-600" /> En livraison : <b className="text-gray-950">{selectedModeleDetails.quantiteLivraison}</b></span>
                <span>Nombre en stock : <b className="text-emerald-700">{editMode
                  ? editedVariations.reduce((sum, v) => sum + v.quantitePrincipale, 0)
                  : selectedModeleDetails.quantiteTotal
                }</b></span>
              </div>

              {/* Boutons action */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-black text-gray-900 sm:text-lg">Variations du modèle</h3>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800 sm:text-sm"
                  >
                    <Edit2 size={15} />
                    <span>Modifier</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditedVariations(selectedModeleDetails.variations.map(v => ({
                          ...v,
                          quantitePrincipale: v.quantitePrincipale || v.quantite || 0,
                          prix: v.prix
                        })));
                      }}
                      className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
                    >
                      <Save size={15} />
                      <span>Sauvegarder</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={detailSearchTerm}
                  onChange={(event) => setDetailSearchTerm(event.target.value)}
                  className="input !rounded-xl !py-2 pl-9 text-sm"
                  placeholder="Filtrer par taille ou couleur…"
                />
              </div>

              {detailRows.length === 0 && (
                <div className="rounded-xl bg-white py-8 text-center text-sm font-bold text-gray-500 ring-1 ring-gray-200">
                  Aucune variation ne correspond à cette recherche.
                </div>
              )}

              {/* Cartes compactes sur mobile */}
              <div className="space-y-2 md:hidden">
                {detailRows.map(({ variation, index }) => {
                  const qty = variation.quantitePrincipale || variation.quantite || 0;
                  const reserved = variation.quantiteReservee || 0;
                  const available = Math.max(qty - reserved, 0);
                  return (
                    <div key={variation._id || variation.id || index} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-gray-950">{variation.couleur}</p>
                          <p className="text-xs font-bold text-gray-500">Taille {variation.taille}</p>
                        </div>
                        <span className="text-xs font-black text-violet-700">{Number(variation.prix || 0).toLocaleString('fr-FR')} F</span>
                      </div>
                      {editMode ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="text-[10px] font-black uppercase text-gray-500">
                            Quantité physique
                            <input
                              type="number"
                              value={variation.quantitePrincipale}
                              onChange={(event) => handleEditVariation(index, 'quantitePrincipale', parseInt(event.target.value) || 0)}
                              min="0"
                              className="input mt-1 !py-2 text-sm font-black"
                            />
                          </label>
                          <label className="text-[10px] font-black uppercase text-gray-500">
                            Prix unitaire
                            <input
                              type="number"
                              value={variation.prix}
                              onChange={(event) => handleEditVariation(index, 'prix', parseInt(event.target.value) || 0)}
                              min="0"
                              step="100"
                              className="input mt-1 !py-2 text-sm font-black"
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                          {[
                            ['Physique', qty, 'text-emerald-700'],
                            ['Réservé', reserved, 'text-indigo-700'],
                            ['Disponible', available, available <= 2 ? 'text-red-600' : 'text-cyan-700'],
                            ['Livraison', variation.quantiteEnLivraison || 0, 'text-amber-700'],
                          ].map(([label, value, color]) => (
                            <div key={label} className="rounded-lg bg-gray-50 px-1 py-2">
                              <p className={`text-lg font-black ${color}`}>{value}</p>
                              <p className="text-[8px] font-black uppercase text-gray-400">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tableau complet sur ordinateur */}
              <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-blue-50 border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Taille</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Couleur</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Nombre en stock</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Réservé</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Disponible</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">En Livraison</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Prix Unitaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map(({ variation, index }) => {
                      const qty = variation.quantitePrincipale || variation.quantite || 0;
                      const reserved = variation.quantiteReservee || 0;
                      const available = Math.max(qty - reserved, 0);
                      return (
                        <tr key={variation._id || variation.id || index} className="border-b border-gray-100 hover:bg-emerald-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <span className="badge badge-secondary font-bold">{variation.taille}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="badge badge-info font-bold">{variation.couleur}</span>
                          </td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <input
                                type="number"
                                value={variation.quantitePrincipale}
                                onChange={(e) => handleEditVariation(index, 'quantitePrincipale', parseInt(e.target.value) || 0)}
                                min="0"
                                className="input w-24 font-bold text-lg"
                              />
                            ) : (
                              <span className={`font-bold text-lg ${qty <= 2 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {qty}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-lg text-indigo-600">{reserved}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold text-lg ${available <= 2 ? 'text-red-600' : 'text-cyan-600'}`}>
                              {available}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-lg text-amber-600">
                              {variation.quantiteEnLivraison || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <input
                                type="number"
                                value={variation.prix}
                                onChange={(e) => handleEditVariation(index, 'prix', parseInt(e.target.value) || 0)}
                                min="0"
                                step="100"
                                className="input w-32 font-bold"
                              />
                            ) : (
                              <span className="font-bold text-gray-900">
                                {variation.prix?.toLocaleString('fr-FR')} F
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter au Stock (reste identique) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm animate-fade-in sm:p-4">
          <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-gray-50 shadow-2xl animate-scale-in sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-700 p-4 sm:p-5">
              <h2 className="text-xl font-black text-white sm:text-2xl">
                Ajouter au Stock
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedModele(null);
                  setCustomTailles([]);
                  setCustomCouleurs([]);
                  setVariations([]);
                  setModelSearchTerm('');
                }}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 p-3 sm:space-y-6 sm:p-5">
              {!selectedModele ? (
                <>
                  <div>
                    <p className="font-black text-gray-900">Choisissez un modèle du catalogue</p>
                    <p className="text-xs text-gray-500">Vous ajouterez ensuite les tailles, couleurs et quantités.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <input
                      type="text"
                      value={modelSearchTerm}
                      onChange={(event) => setModelSearchTerm(event.target.value)}
                      className="input !rounded-xl !py-2.5 pl-10 text-sm"
                      placeholder="Rechercher dans le catalogue…"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                    {modeles
                      .filter(m => m.actif !== false)
                      .filter(m => !modelSearchTerm.trim() || m.nom?.toLocaleLowerCase('fr').includes(modelSearchTerm.trim().toLocaleLowerCase('fr')))
                      .map((modele) => (
                      <button
                        key={modele.id || modele._id}
                        type="button"
                        onClick={() => handleModeleSelect(modele)}
                        className="group flex items-center gap-3 rounded-xl bg-white p-2.5 text-left shadow-sm ring-1 ring-gray-200 transition hover:ring-emerald-400 hover:shadow-md"
                      >
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                          {modele.image ? (
                            <img src={modele.image} alt={modele.nom} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center"><Package className="text-emerald-500" size={24} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-black text-gray-900">{modele.nom}</h3>
                          <p className="truncate text-xs text-gray-500">{modele.categorie || 'Catalogue'}</p>
                          <p className="mt-1 text-sm font-black text-emerald-700">
                            {Number(modele.prixBase || modele.prix_base || 0).toLocaleString('fr-FR')} F
                          </p>
                        </div>
                        <ChevronRight size={17} className="flex-shrink-0 text-gray-300 group-hover:text-emerald-600" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Modèle sélectionné */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase">Modèle sélectionné</p>
                        <h3 className="text-2xl font-black text-gray-900">{selectedModele.nom}</h3>
                        <p className="text-gray-600">Prix de base: {(selectedModele.prixBase || selectedModele.prix_base)?.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedModele(null);
                          setCustomTailles([]);
                          setCustomCouleurs([]);
                          setVariations([]);
                        }}
                        className="btn btn-secondary"
                      >
                        Changer
                      </button>
                    </div>
                  </div>

                  {/* Ajouter Tailles */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      ✂️ Tailles disponibles *
                    </h3>
                    
                    {customTailles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {customTailles.map(taille => (
                          <span key={taille} className="badge badge-primary px-4 py-2 flex items-center space-x-2">
                            <span className="font-bold">{taille}</span>
                            <button onClick={() => removeTaille(taille)} className="hover:text-red-600">
                              <X size={16} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mb-2">Suggestions rapides:</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {taillesSuggestions.map(taille => (
                        <button
                          key={taille}
                          type="button"
                          onClick={() => addTaille(taille)}
                          disabled={customTailles.includes(taille)}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            customTailles.includes(taille)
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-blue-500 hover:text-white'
                          }`}
                        >
                          {taille}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newTaille}
                        onChange={(e) => setNewTaille(e.target.value.toUpperCase())}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addTaille(newTaille);
                            setNewTaille('');
                          }
                        }}
                        placeholder="Taille personnalisée..."
                        className="input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addTaille(newTaille);
                          setNewTaille('');
                        }}
                        className="btn btn-primary"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Ajouter Couleurs */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        🎨 Couleurs disponibles *
                      </h3>
                      <button
                        type="button"
                        onClick={() => setModeBicolore(!modeBicolore)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                          modeBicolore
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span>🎨🎨</span>
                        <span>Bicolore / 2 tons</span>
                      </button>
                    </div>
                    
                    {customCouleurs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {customCouleurs.map(couleur => (
                          <span key={couleur} className={`px-4 py-2 flex items-center space-x-2 rounded-full font-bold text-sm ${
                            couleur.includes(' / ')
                              ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-2 border-purple-300'
                              : 'badge badge-info'
                          }`}>
                            <span className="font-bold">{couleur}</span>
                            <button onClick={() => removeCouleur(couleur)} className="hover:text-red-600 ml-1">
                              <X size={16} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Mode bicolore */}
                    {modeBicolore && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4 border-2 border-purple-200">
                        <p className="text-sm font-bold text-purple-800 mb-3">
                          Combiner 2 couleurs en une seule variation :
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            value={bicolore1}
                            onChange={(e) => setBicolore1(e.target.value)}
                            className="input flex-1 font-semibold"
                          >
                            <option value="">Couleur 1...</option>
                            {couleursSuggestions.map(c => (
                              <option key={c} value={c} disabled={c === bicolore2}>{c}</option>
                            ))}
                          </select>
                          <span className="text-center font-black text-purple-600 text-lg">/</span>
                          <select
                            value={bicolore2}
                            onChange={(e) => setBicolore2(e.target.value)}
                            className="input flex-1 font-semibold"
                          >
                            <option value="">Couleur 2...</option>
                            {couleursSuggestions.map(c => (
                              <option key={c} value={c} disabled={c === bicolore1}>{c}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={addBicolore}
                            disabled={!bicolore1 || !bicolore2 || bicolore1 === bicolore2}
                            className="btn btn-primary whitespace-nowrap disabled:opacity-50"
                          >
                            <Plus size={18} className="inline mr-1" />
                            Ajouter
                          </button>
                        </div>
                        {bicolore1 && bicolore2 && bicolore1 !== bicolore2 && (
                          <p className="text-sm text-purple-700 mt-2 font-semibold">
                            Sera enregistre comme : <span className="font-black">{bicolore1} / {bicolore2}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mb-2">Suggestions rapides (couleur unie) :</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {couleursSuggestions.map(couleur => (
                        <button
                          key={couleur}
                          type="button"
                          onClick={() => addCouleur(couleur)}
                          disabled={customCouleurs.includes(couleur)}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            customCouleurs.includes(couleur)
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-purple-500 hover:text-white'
                          }`}
                        >
                          {couleur}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newCouleur}
                        onChange={(e) => setNewCouleur(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addCouleur(newCouleur);
                            setNewCouleur('');
                          }
                        }}
                        placeholder="Couleur personnalisee..."
                        className="input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addCouleur(newCouleur);
                          setNewCouleur('');
                        }}
                        className="btn btn-primary"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Matrice des variations */}
                  {customTailles.length > 0 && customCouleurs.length > 0 && (
                    <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        📦 Ajouter les quantités par taille et couleur
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                                Taille
                              </th>
                              <th className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                                Couleur
                              </th>
                              <th className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                                Quantité
                              </th>
                              <th className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                                Prix (FCFA)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {variations.map((variation, index) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-blue-50/30">
                                <td className="px-4 py-3">
                                  <span className="badge badge-secondary">{variation.taille}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="badge badge-info">{variation.couleur}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={variation.quantite}
                                    onChange={(e) => updateVariation(index, 'quantite', parseInt(e.target.value) || 0)}
                                    min="0"
                                    className="input w-24"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={variation.prix}
                                    onChange={(e) => updateVariation(index, 'prix', parseInt(e.target.value) || 0)}
                                    min="0"
                                    step="100"
                                    className="input w-32"
                                    placeholder="0"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModele(null);
                        setCustomTailles([]);
                        setCustomCouleurs([]);
                        setVariations([]);
                      }}
                      className="btn btn-secondary"
                    >
                      Retour
                    </button>
                    <button
                      onClick={handleSubmitVariations}
                      disabled={customTailles.length === 0 || customCouleurs.length === 0 || variations.filter(v => v.quantite > 0).length === 0}
                      className="btn btn-success flex items-center space-x-2"
                    >
                      <Save size={20} />
                      <span>Ajouter au Stock</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
