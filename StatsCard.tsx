interface StatsCardProps {
  icon: string;
  title: string;
  value: string;
  color: string;
  bgColor: string;
}

export function StatsCard({ icon, title, value, color, bgColor }: StatsCardProps) {
  return (
    <div className="bg-card rounded-lg p-4 border border-border flex items-center">
      <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center ${color}`}>
        <i className={`fas fa-${icon} text-lg`}></i>
      </div>
      <div className="ml-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
