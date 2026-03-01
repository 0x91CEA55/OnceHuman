import React from 'react';

interface DiegeticFrameProps {
    children: React.ReactNode;
    title?: string;
    subTitle?: string;
    className?: string;
    accentColor?: string;
    showGrid?: boolean;
}

export const DiegeticFrame: React.FC<DiegeticFrameProps> = ({ 
    children, 
    title, 
    subTitle,
    className = "",
    accentColor = "var(--primary)",
    showGrid = true
}) => {
    return (
        <div className={`relative bg-black/60 backdrop-blur-xl group overflow-hidden ${className}`}>
            {/* The "Grit" Grid (Blueprint Style) */}
            {showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                     style={{ backgroundImage: `radial-gradient(${accentColor} 0.5px, transparent 0.5px)`, backgroundSize: '10px 10px' }}>
                </div>
            )}

            {/* Corner Brackets - Sharper & More Prominent */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-[1px] border-l-[1px]" style={{ borderColor: accentColor }}></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-[1px] border-r-[1px] opacity-20" style={{ borderColor: accentColor }}></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[1px] border-l-[1px] opacity-20" style={{ borderColor: accentColor }}></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[1px] border-r-[1px]" style={{ borderColor: accentColor }}></div>

            {/* Faint edge line - not a solid border */}
            <div className="absolute inset-0 border border-white/[0.03] pointer-events-none"></div>

            {/* Top Bar Label - Technical Style */}
            {(title || subTitle) && (
                <div className="absolute -top-px left-8 flex items-baseline gap-3">
                    <div className="h-4 w-px bg-primary opacity-40"></div>
                    <div className="flex flex-col -mt-1">
                        {title && <span className="text-[10px] font-black tracking-[0.4em] uppercase text-primary drop-shadow-[0_0_5px_rgba(77,184,255,0.5)]">{title}</span>}
                        {subTitle && <span className="text-[6px] font-bold tracking-[0.2em] uppercase text-muted-foreground opacity-40 leading-none">{subTitle}</span>}
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className="p-5 h-full relative z-10">
                {children}
            </div>

            {/* Technical Metadata Footer */}
            <div className="absolute bottom-1 right-2 px-2 text-[5px] font-mono text-muted-foreground/30 tracking-widest uppercase pointer-events-none">
                [ {new Date().getTime().toString(16).toUpperCase()} // OH_SYS_TERM ]
            </div>
        </div>
    );
};
