import React, { forwardRef } from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    className?: string;
}

export type IconNode = [elementName: string, attrs: Record<string, string | number>][];

export type LucideIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
export type Icon = LucideIcon;

export function createIcon(name: string, iconNode: IconNode): LucideIcon {
    const Component = forwardRef<SVGSVGElement, IconProps>(({
        color = 'currentColor',
        size = 24,
        strokeWidth = 2,
        className = '',
        children,
        ...rest
    }, ref) => {
        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                {...rest}
            >
                {iconNode.map(([tag, attrs], idx) => React.createElement(tag, { ...attrs, key: idx }))}
                {children}
            </svg>
        );
    });
    Component.displayName = name;
    return Component;
}
