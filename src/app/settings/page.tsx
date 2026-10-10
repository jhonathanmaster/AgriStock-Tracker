
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Scale, 
  RefreshCcw, 
  Pencil, 
  Save, 
  X, 
  RotateCcw, 
  ShieldAlert, 
  AlertTriangle, 
  Coins, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Fingerprint, 
  User, 
  Image as ImageIcon, 
  Upload, 
  Signature 
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useToast } from '@/hooks/use-toast';
import { UnitConversion } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { 
    conversions, 
    updateUnitConversion, 
    seedDefaultConversions, 
    criticalThreshold, 
    updateCriticalThreshold, 
    initialCapital,
    updateInitialCapital,
    companyInfo,
    updateCompanyInfo,
    isLoading, 
    isAdmin 
  } = useAgriStock();
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFactor, setEditFactor] = useState<string>('');
  const [newThreshold, setNewThreshold] = useState<string>('');
  const [newInitialCapital, setNewInitialCapital] = useState<string>('');

  // Form states para información de la empresa
  const [compName, setCompName] = useState('');
  const [compNit, setCompNit] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [repName, setRepName] = useState('');
  const [repPos, setRepPos] = useState('');
  
  // URLs de imágenes
  const [logoUrl, setLogoUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && !isLoading && user && !isAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, isLoading, router, isAdmin]);

  useEffect(() => {
    if (!isLoading && !initialDataLoaded && companyInfo) {
      setCompName(companyInfo.name || '');
      setCompNit(companyInfo.nit || '');
      setCompAddress(companyInfo.address || '');
      setCompPhone(companyInfo.phone || '');
      setCompEmail(companyInfo.email || '');
      setRepName(companyInfo.representativeName || '');
      setRepPos(companyInfo.representativePosition || '');
      setLogoUrl(companyInfo.logoUrl || '');
      setIconUrl(companyInfo.iconUrl || '');
      setSignatureUrl(companyInfo.signatureUrl || '');
      
      if (criticalThreshold !== undefined) setNewThreshold(criticalThreshold.toString());
      if (initialCapital !== undefined) setNewInitialCapital(initialCapital.toString());
      
      setInitialDataLoaded(true);
    }
  }, [isLoading, initialDataLoaded, companyInfo, criticalThreshold, initialCapital]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'icon' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { 
        toast({ variant: "destructive", title: "Archivo muy grande", description: "Selecciona una imagen menor a 1MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'logo') setLogoUrl(result);
        else if (type === 'icon') setIconUrl(result);
        else if (type === 'signature') setSignatureUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isUserLoading || isLoading || !mounted) {
    return <LoadingScreen />;
  }

  if (!user || !isAdmin) return null;

  const handleEdit = (conv: UnitConversion) => {
    setEditingId(conv.id);
    setEditFactor(conv.factor.toString());
  };

  const handleSave = () => {
    if (editingId && editFactor) {
      updateUnitConversion(editingId, parseFloat(editFactor));
      setEditingId(null);
      toast({ title: "Factor Actualizado", description: "La conversión ha sido modificada con éxito." });
    }
  };

  const handleSaveThreshold = () => {
    if (newThreshold) {
      updateCriticalThreshold(parseFloat(newThreshold));
      toast({ title: "Umbral Actualizado", description: "El parámetro de stock crítico ha sido guardado." });
    }
  };

  const handleSaveInitialCapital = () => {
    if (newInitialCapital !== '') {
      updateInitialCapital(parseFloat(newInitialCapital));
      toast({ title: "Capital Inicial Actualizado", description: "El capital de inversión de la empresa ha sido registrado." });
    }
  };

  const handleSaveCompanyInfo = () => {
    updateCompanyInfo({
      companyName: compName,
      companyNit: compNit,
      companyAddress: compAddress,
      companyPhone: compPhone,
      companyEmail: compEmail,
      representativeName: repName,
      representativePosition: repPos,
      logoUrl: logoUrl,
      iconUrl: iconUrl,
      signatureUrl: signatureUrl
    });
    toast({ title: "Información Actualizada", description: "Los datos de la empresa han sido guardados correctamente." });
  };

  const handleReset = () => {
    seedDefaultConversions();
    toast({ title: "Valores Restaurados", description: "Se han cargado los factores estándar." });
  };

  return (
    <main className="flex-1 p-8 space-y-6 overflow-auto">
      <header className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuración del Sistema</h1>
            <p className="text-muted-foreground">Parámetros operativos e identidad visual del negocio</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
          Restaurar Estándares
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* INFORMACIÓN DE LA EMPRESA */}
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="flex flex-row items-center gap-2 border-b">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Información de la Empresa</CardTitle>
                <CardDescription>Datos legales para facturas y cotizaciones</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Nombre Comercial</Label>
                  <Input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Ej: GeiaTienda" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Fingerprint className="w-3.5 h-3.5" /> NIT / Identificación</Label>
                  <Input value={compNit} onChange={e => setCompNit(e.target.value)} placeholder="000.000.000-0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Dirección Física</Label>
                <Input value={compAddress} onChange={e => setCompAddress(e.target.value)} placeholder="Ciudad, Barrio, Calle..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Teléfono Contacto</Label>
                  <Input value={compPhone} onChange={e => setCompPhone(e.target.value)} placeholder="+57 300..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Correo Institucional</Label>
                  <Input type="email" value={compEmail} onChange={e => setCompEmail(e.target.value)} placeholder="contacto@empresa.com" />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Representación Legal
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Nombre del Representante</Label>
                    <Input value={repName} onChange={e => setRepName(e.target.value)} placeholder="Nombre completo" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Cargo / Título</Label>
                    <Input value={repPos} onChange={e => setRepPos(e.target.value)} placeholder="Ej: Gerente General" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveCompanyInfo} className="w-full gap-2 mt-2">
                <Save className="w-4 h-4" />
                Actualizar Datos de Empresa
              </Button>
            </CardContent>
          </Card>

          {/* IDENTIDAD VISUAL Y FIRMAS */}
          <Card className="shadow-sm border-accent/20">
            <CardHeader className="flex flex-row items-center gap-2 border-b">
              <ImageIcon className="w-5 h-5 text-accent" />
              <div>
                <CardTitle className="text-lg">Identidad Visual y Firmas</CardTitle>
                <CardDescription>Logo, iconos y firmas para documentos oficiales</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LOGO */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logo de la Empresa</Label>
                  <div className="relative group bg-muted/30 rounded-xl border-2 border-dashed border-border aspect-video flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Company Logo" fill className="object-contain p-2" unoptimized />
                    ) : (
                      <Building2 className="w-10 h-10 opacity-20" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => logoInputRef.current?.click()} className="h-8 text-[10px] font-bold">
                        <Upload className="w-3 h-3 mr-1" /> CAMBIAR
                      </Button>
                      {logoUrl && (
                        <Button type="button" size="sm" variant="destructive" onClick={() => setLogoUrl('')} className="h-8 w-8 p-0">
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={(e) => handleFileChange(e, 'logo')} />
                </div>

                {/* ICONO */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Icono Principal</Label>
                  <div className="relative group bg-muted/30 rounded-xl border-2 border-dashed border-border aspect-square w-32 mx-auto flex items-center justify-center overflow-hidden">
                    {iconUrl ? (
                      <Image src={iconUrl} alt="Company Icon" fill className="object-contain p-2" unoptimized />
                    ) : (
                      <ImageIcon className="w-8 h-8 opacity-20" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => iconInputRef.current?.click()} className="h-8 text-[10px] font-bold">
                        <Upload className="w-3 h-3" />
                      </Button>
                      {iconUrl && (
                        <Button type="button" size="sm" variant="destructive" onClick={() => setIconUrl('')} className="h-8 w-8 p-0">
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={iconInputRef} onChange={(e) => handleFileChange(e, 'icon')} />
                </div>
              </div>

              <Separator />

              {/* FIRMA */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Signature className="w-4 h-4 text-primary" />
                  Firma Digital del Representante
                </Label>
                <div className="relative group bg-white rounded-xl border-2 border-dashed border-border h-32 flex items-center justify-center overflow-hidden">
                  {signatureUrl ? (
                    <Image src={signatureUrl} alt="Representative Signature" fill className="object-contain p-2" unoptimized />
                  ) : (
                    <div className="text-center opacity-20">
                      <Pencil className="w-8 h-8 mx-auto mb-1" />
                      <p className="text-[10px] uppercase font-black">Sin Firma Registrada</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => signatureInputRef.current?.click()} className="h-8 text-[10px] font-bold">
                      <Upload className="w-3 h-3 mr-1" /> CARGAR FIRMA (PNG/JPG)
                    </Button>
                    {signatureUrl && (
                      <Button type="button" size="sm" variant="destructive" onClick={() => setSignatureUrl('')} className="h-8 w-8 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic text-center">
                  * Se recomienda cargar una imagen con fondo transparente para un acabado profesional en las cotizaciones.
                </p>
                <input type="file" accept="image/*" className="hidden" ref={signatureInputRef} onChange={(e) => handleFileChange(e, 'signature')} />
              </div>

              <Button onClick={handleSaveCompanyInfo} className="w-full gap-2 bg-accent hover:bg-accent/90 text-white">
                <Save className="w-4 h-4" />
                Guardar Cambios Visuales
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="shadow-sm border-accent/20">
            <CardHeader className="flex flex-row items-center gap-2 border-b">
              <AlertTriangle className="w-5 h-5 text-accent" />
              <div>
                <CardTitle className="text-lg">Parámetros de Alerta</CardTitle>
                <CardDescription>Define cuándo un producto entra en estado crítico</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Umbral de Stock Mínimo</Label>
                <div className="flex gap-4">
                  <Input 
                    id="threshold"
                    type="number"
                    value={newThreshold}
                    onChange={e => setNewThreshold(e.target.value)}
                    className="max-w-[150px]"
                  />
                  <Button onClick={handleSaveThreshold} className="gap-2">
                    <Save className="w-4 h-4" />
                    Guardar Umbral
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * Los productos con stock menor o igual a este valor se resaltarán en rojo en el inventario y tablero.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20">
            <CardHeader className="flex flex-row items-center gap-2 border-b">
              <Coins className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Parámetros Financieros</CardTitle>
                <CardDescription>Configuración de capital y presupuestos</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="initialCapital">Capital Inicial de Inversión ($)</Label>
                <div className="flex gap-4">
                  <Input 
                    id="initialCapital"
                    type="number"
                    step="0.01"
                    value={newInitialCapital}
                    onChange={e => setNewInitialCapital(e.target.value)}
                    className="max-w-[200px]"
                    placeholder="0.00"
                  />
                  <Button onClick={handleSaveInitialCapital} className="gap-2 bg-primary">
                    <Save className="w-4 h-4" />
                    Guardar Capital
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * Este valor representa el capital total aportado para el inicio de operaciones y se usará para cálculos de rentabilidad global.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b">
              <Scale className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Unidades de Medida</CardTitle>
                <CardDescription>Definiciones base del inventario</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div>
                    <p className="font-bold text-primary">Kilos (kg)</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Unidad Base Universal</p>
                  </div>
                  <Badge className="bg-primary hover:bg-primary">Referencia</Badge>
                </div>
                <div className="flex justify-between items-center p-4 border border-border rounded-xl">
                  <div>
                    <p className="font-bold">Libras (lb)</p>
                    <p className="text-xs text-muted-foreground">Equivale a 0.453 kg aprox.</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 border border-border rounded-xl">
                  <div>
                    <p className="font-bold">Bultos</p>
                    <p className="text-xs text-muted-foreground">Variable (Estándar de 40kg para granos)</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 border border-border rounded-xl">
                  <div>
                    <p className="font-bold">Unidades</p>
                    <p className="text-xs text-muted-foreground">Conteo discreto por ítem</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-accent" />
                <div>
                  <CardTitle className="text-lg">Factores de Conversión</CardTitle>
                  <CardDescription>Algoritmos de cálculo de equivalencias</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-accent border-accent gap-1">
                <ShieldAlert className="w-3 h-3" />
                Solo Admin
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hacia</TableHead>
                    <TableHead className="text-right">Multiplicar por (Factor)</TableHead>
                    <TableHead className="w-20 text-center">Editar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                        No hay factores dinámicos cargados. <br/>
                        <Button variant="link" onClick={handleReset}>Cargar iniciales</Button>
                      </TableCell>
                    </TableRow>
                  ) : conversions.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/10">
                      <TableCell className="capitalize font-medium">{c.from}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{c.to}</TableCell>
                      <TableCell className="text-right">
                        {editingId === c.id ? (
                          <Input 
                            type="number" 
                            step="0.000001" 
                            className="h-8 w-32 ml-auto text-right font-mono"
                            value={editFactor} 
                            onChange={e => setEditFactor(e.target.value)}
                          />
                        ) : (
                          <span className="font-mono font-bold text-accent">{c.factor.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === c.id ? (
                          <div className="flex gap-1 justify-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSave}>
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleEdit(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 bg-muted/20 border-t">
                <p className="text-[10px] text-muted-foreground italic">
                  * El factor se aplica como: <b>Cantidad Base * Factor = Cantidad Destino</b>. <br/>
                  Ej: Si 1 Bulto = 40 Kilos, el factor de 'bultos' a 'kilos' debe ser 40.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
