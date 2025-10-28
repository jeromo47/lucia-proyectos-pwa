export default function Badge({ text, color }: { text: string; color?: string }) {
  return (
    <span
      className="text-xs px-2 py-1 rounded-full border"
      style={{ borderColor: color || '#ccc', color: color || '#333' }}
    >
      {text}
    </span>
  );
}
