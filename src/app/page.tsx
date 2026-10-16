
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Package, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  ShieldX, 
  DollarSign,
  BarChart3,
  Wallet,
  PiggyBank,
  ReceiptText,
  Coins,
  Sprout,
  LogIn,
  Search,
  ShoppingCart,
  ChevronRight,
  Archive,
  Globe,
  ImageIcon,
  Mail,
  LayoutDashboard,
  MapPin,
  Clock,
  X,
  Phone,
  Facebook,
  Share2
} from 'lucide-react';
import { QuickSale } from '@/components/QuickSale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { cn } from '@/lib/utils';
import placeholderData from '@/app/lib/placeholder-images.json';
import { useToast } from '@/hooks/use-toast';
import { ColdesoftCredit } from '@/components/ColdesoftCredit';

/**
 * Utilidad para generar un slug amigable a partir del nombre del producto.
 */
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios por guiones
    .replace(/[^\w-]+/g, '') // Eliminar caracteres no permitidos
    .replace(/--+/g, '-'); // Evitar guiones dobles
};

/**
 * Vista de Página de Inicio Pública (Landing Page)
 * Se muestra cuando el usuario no está autenticado o explícitamente se solicita.
 */
function PublicLanding() {
  const { products, categories, isLoading } = useAgriStock();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const heroImage = useMemo(() => {
    return placeholderData?.placeholderImages?.find(img => img.id === 'hero-farm-landscape');
  }, []);

  // Filtrar categorías que SÍ tienen productos asociados
  const activeCategories = useMemo(() => {
    if (!products || !categories) return [];
    const productCategoryNames = new Set(products.map(p => p.category));
    return categories.filter(cat => productCategoryNames.has(cat.name));
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                           (p.referenceCode?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleShare = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareData = {
      title: 'GeiaTienda Tracker',
      text: 'Gestiona tu inventario agrícola con GeiaTienda. ¡Mira nuestro catálogo!',
      url: origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData).catch(() => {
          if (origin) navigator.clipboard.writeText(origin);
          toast({ title: "Enlace Copiado", description: "El link del portal se ha copiado al portapapeles." });
        });
      } else {
        if (origin) await navigator.clipboard.writeText(origin);
        toast({ title: "Enlace Copiado", description: "El link del portal se ha copiado al portapapeles." });
      }
    } catch (err) {
      console.error("Error al compartir:", err);
      if (origin) navigator.clipboard.writeText(origin);
      toast({ title: "Enlace Copiado", description: "El link del portal se ha copiado al portapapeles." });
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8ED] flex flex-col">
      {/* CABECERA PÚBLICA */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl text-primary leading-none">GeiaTienda</h1>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">Suministros Agrícolas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="https://wa.me/573219130614" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 mr-4 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-black text-primary">321 913 0614</span>
            </a>
            
            <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground hover:text-primary gap-2 h-10 px-3">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>

            <Link href="/contact" className="hidden sm:block">
              <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent/10 h-10 px-6 font-bold shadow-sm">
                <Mail className="w-4 h-4" />
                Contáctenos
              </Button>
            </Link>
            {!user ? (
              <Link href="/login">
                <Button variant="default" className="gap-2 shadow-md h-10 px-6 font-bold">
                  <LogIn className="w-4 h-4" />
                  Acceder al Sistema
                </Button>
              </Link>
            ) : (
              <Link href="/">
                <Button variant="default" className="gap-2 shadow-md h-10 px-6 font-bold">
                  <LayoutDashboard className="w-4 h-4" />
                  Ir al Tablero
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* SECCIÓN HERO */}
      <section className="relative overflow-hidden py-24 md:py-36 text-white">
        <div className="absolute inset-0 z-0">
          <Image 
            src={heroImage?.imageUrl || "https://picsum.photos/seed/pig-farm-hero-banner/1920/1080"} 
            alt="Animales de Granja" 
            fill 
            className="object-cover"
            priority
            data-ai-hint="pig farm"
          />
          <div className="absolute inset-0 bg-black/40 backdrop-brightness-75" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center space-y-8">
          <Badge className="bg-primary/90 text-white border-none px-6 py-1.5 backdrop-blur-md text-xs font-bold uppercase tracking-[0.2em] shadow-lg">
            Nutrición y Salud Animal
          </Badge>
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-[1.1] drop-shadow-2xl">
              Lo mejor para quienes alimentan al mundo.
            </h2>
            <p className="text-white/90 text-xl md:text-2xl max-w-2xl mx-auto font-medium drop-shadow-md">
              Encuentra los concentrados, suplementos y herramientas que tus animales necesitan para prosperar.
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <Button size="lg" className="rounded-full h-14 px-10 text-lg font-bold shadow-2xl transition-transform hover:scale-105" asChild>
              <a href="#catalogo">Ver Catálogo de Insumos</a>
            </Button>
          </div>
        </div>
      </section>

      {/* CATÁLOGO DE PRODUCTOS */}
      <main id="catalogo" className="container mx-auto px-4 py-12 flex-1 space-y-10">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white p-6 rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="relative w-full lg:w-96 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o referencia..." 
              className="pl-10 h-12 bg-muted/20 border-none focus-visible:ring-primary" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar scroll-smooth">
            <Button 
              variant={selectedCategory === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="rounded-full px-6 font-bold shrink-0 whitespace-nowrap"
            >
              Todos
            </Button>
            {activeCategories.map(cat => (
              <Button 
                key={cat.id}
                variant={selectedCategory === cat.name ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedCategory(cat.name)}
                className="rounded-full px-6 font-bold whitespace-nowrap shrink-0"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(p => (
            <Link key={p.id} href={`/producto/${slugify(p.name)}`} className="flex flex-col h-full group">
              <Card className="group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white flex flex-col h-full cursor-pointer">
                <div className="relative h-56 w-full bg-muted">
                  {p.imageUrl ? (
                    <Image 
                      src={p.imageUrl} 
                      alt={p.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 300px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/30 bg-muted/50">
                      <ImageIcon className="w-12 h-12" />
                      <span className="text-[10px] uppercase font-bold mt-2">Sin Imagen</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <Badge className="bg-primary/90 text-white backdrop-blur-md shadow-sm border-none">
                      {p.category}
                    </Badge>
                    {p.isImported && (
                      <Badge className="bg-accent/90 text-white backdrop-blur-md border-none gap-1">
                        <Globe className="w-3 h-3" /> IMP
                      </Badge>
                    )}
                  </div>
                </div>

                <CardHeader className="p-5 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{p.referenceCode}</p>
                      <CardTitle className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                        {p.name}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 italic min-h-[32px]">
                      {p.description || "Insumo de alta calidad para producción agrícola profesional."}
                    </p>
                    
                    <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase">
                      <Archive className="w-3.5 h-3.5" />
                      Para {p.animalType}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-dashed border-border flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Precio venta</p>
                      <p className="text-2xl font-black text-primary leading-none">
                        ${p.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 rounded-full text-[10px] font-black uppercase tracking-tight gap-1 border-primary/20 text-primary">
                      Ver Ficha <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {filteredProducts.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">No se encontraron productos</h3>
              <p className="text-muted-foreground">Prueba con otros términos de búsqueda o filtros.</p>
              <Button variant="link" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}>
                Ver todo el catálogo
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* PIE DE PÁGINA */}
      <footer className="bg-white border-t border-border py-12 mt-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Sprout className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg text-primary">GeiaTienda</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gestión profesional de suministros para granjas y proyectos agrícolas. Eficiencia y control desde el inventario hasta la venta.
            </p>
            <div className="flex gap-3">
              <Link 
                href="https://www.facebook.com/share/1GFxFY1r7J/?mibextid=wwXIfr" 
                target="_blank" 
                className="bg-primary/10 p-2 rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                title="Síguenos en Facebook"
              >
                <Facebook className="w-5 h-5" />
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Inicio / Catálogo</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Quiénes Somos</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Acceso Personal</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Contáctenos</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Contacto</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Corregimiento de Borrero Ayerbe, Dagua - Valle</p>
              <a 
                href="https://wa.me/573219130614" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 font-bold text-primary hover:underline"
              >
                <Phone className="w-4 h-4" /> 321 913 0614
              </a>
              <p className="flex items-center gap-2 font-bold text-primary"><Mail className="w-4 h-4" /> grupoempresarialinversonessas@gmail.com</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Horario de Atención</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Lunes a Sábado: 8am - 6pm</p>
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Domingos: 8am - 12pm</p>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} GeiaTienda Tracker - Gestión Profesional de Inventario
          <ColdesoftCredit className="mt-4 flex" />
        </div>
      </footer>
    </div>
  );
}

/**
 * Lógica interna del Home que soporta parámetros de búsqueda
 */
function HomeContent() {
  const { 
    products, 
    recordMovement, 
    saveCustomer,
    dailyIncome, 
    totalHistoricalIncome,
    totalHistoricalCostOfGoodsSold,
    totalHistoricalExpenses,
    initialCapital,
    criticalThreshold,
    isLoading, 
    isEnabled,
    isAdmin,
    profile
  } = useAgriStock();
  
  const { user, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const router = useRouter();
  
  const viewParam = searchParams.get('view');
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
  }, []);

  if (isUserLoading) {
    return <LoadingScreen />;
  }

  // SI NO HAY USUARIO O SE SOLICITA VER EL PORTAL, MOSTRAR LANDING PAGE PÚBLICA
  if (!user || viewParam === 'site') {
    return <PublicLanding />;
  }

  // CRITICAL: Esperar a que Firestore cargue el perfil antes de evaluar isEnabled/isAdmin
  if (isLoading) {
    return <LoadingScreen />;
  }

  // SI HAY USUARIO PERO NO ESTÁ HABILITADO
  if (!isEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F8ED] p-4 text-center">
        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
          <ShieldX className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acceso Restringido</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Tu cuenta aún no ha sido habilitada por el administrador o no cuenta con los permisos necesarios. 
          Por favor, contacta a soporte para obtener acceso al sistema.
        </p>
        <Button onClick={async () => {
          await signOut(auth);
          router.push('/');
        }} variant="outline">Cerrar Sesión</Button>
      </div>
    );
  }

  // DASHBOARD ADMINISTRATIVO
  const totalStockKg = (products || []).reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockProducts = (products || []).filter(p => (p.stock || 0) <= criticalThreshold);
  
  // Nuevo cálculo según solicitud del usuario: (Ingresos Globales + Capital Inicial) - (Costo Mercancía + Egresos Totales)
  const netProfit = (initialCapital || 0) + (totalHistoricalIncome || 0) - (totalHistoricalCostOfGoodsSold || 0) - (totalHistoricalExpenses || 0);

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resumen General</h1>
            <p className="text-muted-foreground">Estado actual de tu inventario de productos</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-muted-foreground">Fecha Actual</p>
          <p className="font-bold">{currentDate || "Cargando..."}</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">En el catálogo actual</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Total (kg/und)</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockKg.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Disponible en almacén</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Por debajo de {criticalThreshold}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
            <TrendingDown className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(dailyIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Ingresos reales hoy</p>
          </CardContent>
        </Card>
      </section>

      {isAdmin && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            
            <Card className="border-accent/20 bg-accent/5 shadow-inner">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Costo Mercancía
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-accent opacity-40" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold text-foreground tracking-tight">
                  ${(totalHistoricalCostOfGoodsSold || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Inversión en ventas</p>
              </CardContent>
            </Card>

            <Card className="border-blue-600/20 bg-blue-50 shadow-inner">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Capital Inicial
                </CardTitle>
                <Badge className="bg-blue-600 text-[10px]">Inversión</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold text-foreground tracking-tight">
                  ${(initialCapital || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-blue-600/70 mt-1">Capital base aportado</p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 shadow-inner">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Ingresos Globales
                </CardTitle>
                <DollarSign className="h-5 w-5 text-primary opacity-40" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold text-foreground tracking-tight">
                  ${(totalHistoricalIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Total facturado histórico</p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5 shadow-inner">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
                  <ReceiptText className="h-4 w-4" />
                  Egresos Totales
                </CardTitle>
                <TrendingDown className="h-5 w-5 text-destructive opacity-40" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold text-foreground tracking-tight">
                  ${(totalHistoricalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Gastos operativos</p>
              </CardContent>
            </Card>

            <Card className={cn("shadow-inner border-opacity-20", netProfit >= 0 ? "border-green-600 bg-green-50" : "border-destructive bg-destructive/5")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", netProfit >= 0 ? "text-green-700" : "text-destructive")}>
                  <PiggyBank className="h-4 w-4" />
                  Utilidad Neta
                </CardTitle>
                <Badge className={cn(netProfit >= 0 ? "bg-green-600" : "bg-destructive")}>Actual</Badge>
              </CardHeader>
              <CardContent>
                <div className={cn("text-xl font-extrabold tracking-tight", netProfit >= 0 ? "text-green-700" : "text-destructive")}>
                  ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className={cn("text-[10px] mt-1", netProfit >= 0 ? "text-green-600/70" : "text-destructive/70")}>Balance acumulado</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent" />
                Inventario Crítico
              </CardTitle>
              <Badge variant="destructive">{lowStockProducts.length}</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Stock Actual</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.slice(0, 5).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-xs">{p.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{p.referenceCode}</TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        {(p.stock || 0).toFixed(2)} <span className="font-normal text-[10px]">{p.mainUnit}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="text-[10px]">Crítico</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lowStockProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Todo el stock está en niveles óptimos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <QuickSale 
            products={products} 
            onSale={(pId, qty, unit, totalValue, ivaPercentage, subTotal, ivaValue, saleDate, customerData) => {
              if (customerData && customerData.name && customerData.phone) {
                saveCustomer({
                  name: customerData.name,
                  phone: customerData.phone,
                  email: customerData.email,
                  address: customerData.address,
                  identificationNumber: customerData.identificationNumber
                });
              }

              const baseMovement = {
                productId: pId,
                type: 'venta' as const,
                quantity: qty,
                unit: unit,
                totalValue: totalValue,
                ivaPercentage: ivaPercentage,
                subTotal: subTotal,
                ivaValue: ivaValue,
                movementDateTime: saleDate
              };

              const movementData = (customerData && customerData.name && customerData.phone) ? {
                ...baseMovement,
                customerName: customerData.name,
                customerPhone: customerData.phone,
                customerEmail: customerData.email,
                customerAddress: customerData.address,
                customerIdentification: customerData.identificationNumber
              } : baseMovement;

              recordMovement(movementData);
            }} 
          />
        </div>
      </div>
    </main>
  );
}

/**
 * Componente Principal Home
 * Alterna entre la Landing Page y el Tablero Administrativo según la sesión.
 */
export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HomeContent />
    </Suspense>
  );
}
