interface ImageCellProps {
  imagePath: string | null | undefined;
  alt?: string;
  className?: string;
}

export function ImageCell({
  imagePath,
  alt = "",
  className = "w-8 h-6 object-cover rounded border",
}: ImageCellProps) {
  if (!imagePath) {
    return <span className="text-muted-foreground">—</span>;
  }

  return <img src={imagePath} alt={alt} className={className} />;
}
