import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props} />
  )
);
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, src, alt, ...props }, ref) => {
    if (!src) return null;
    return (
      <Image
        ref={ref}
        src={src as string}
        alt={alt || ""}
        width={40}
        height={40}
        className={cn("aspect-square h-full w-full object-cover", className)}
        {...(props as Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height">)}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props} />
  )
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
