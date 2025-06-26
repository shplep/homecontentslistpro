import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="page-header">
      <div className="breadcrumb">
        {items.map((item, index) => (
          <div key={index} className="breadcrumb-item">
            {item.href ? (
              <Link href={item.href} className="breadcrumb-link">
                {index === 0 && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                )}
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb-current">{item.label}</span>
            )}
            {index < items.length - 1 && (
              <span className="breadcrumb-separator">/</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 