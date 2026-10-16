import Image from 'next/image';
import { cn } from '@/lib/utils';

const COLDESOFT_URL = 'https://coldesoft.com';

// Crédito "Desarrollado por Coldesoft" con logotipo y enlace a coldesoft.com.
// - "footer": para el pie de página del portal público.
// - "sidebar": versión compacta para el menú lateral; se oculta cuando el menú está colapsado.
export function ColdesoftCredit({
  variant = 'footer',
  className,
}: {
  variant?: 'footer' | 'sidebar';
  className?: string;
}) {
  const isSidebar = variant === 'sidebar';

  return (
    <a
      href={COLDESOFT_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Desarrollado por Coldesoft - coldesoft.com"
      className={cn(
        'inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors',
        isSidebar
          ? 'justify-center w-full px-2 pt-2 group-data-[collapsible=icon]:hidden'
          : 'justify-center',
        className
      )}
    >
      <span
        className={cn(
          'font-bold uppercase',
          isSidebar ? 'text-[9px] tracking-[0.15em]' : 'text-[10px] tracking-[0.2em]'
        )}
      >
        Desarrollado por
      </span>
      <Image
        src="/coldesoft-logo.png"
        alt="Coldesoft"
        width={520}
        height={165}
        className={cn('w-auto', isSidebar ? 'h-5' : 'h-6')}
      />
    </a>
  );
}
