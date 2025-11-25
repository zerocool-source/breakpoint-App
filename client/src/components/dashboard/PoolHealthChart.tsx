import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMockChemicalUsage } from "@/lib/poolbrain-mock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PoolHealthChart() {
  const data = getMockChemicalUsage();

  return (
    <Card className="glass-card border-white/5 col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-display text-lg tracking-wide text-foreground">CHEMICAL USAGE TRENDS</CardTitle>
        <Select defaultValue="chlorine">
          <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-xs h-8 font-ui">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10 text-foreground">
            <SelectItem value="chlorine">Chlorine (ppm)</SelectItem>
            <SelectItem value="ph">pH Level</SelectItem>
            <SelectItem value="alkalinity">Alkalinity</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-[300px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(190 100% 50%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(190 100% 50%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOptimal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(260 100% 65%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(260 100% 65%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              fontFamily="Rajdhani"
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              fontFamily="Rajdhani"
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "rgba(10, 10, 20, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontFamily: "Rajdhani" }}
              itemStyle={{ color: "#fff" }}
            />
            <Area 
              type="monotone" 
              dataKey="usage" 
              stroke="hsl(190 100% 50%)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorUsage)" 
            />
            <Area 
              type="monotone" 
              dataKey="optimal" 
              stroke="hsl(260 100% 65%)" 
              strokeWidth={2}
              strokeDasharray="5 5"
              fillOpacity={1} 
              fill="url(#colorOptimal)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}