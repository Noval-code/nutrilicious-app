import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_MENUS = [
  {
    id: 1,
    title: "Grilled Chicken Quinoa",
    description: "Tinggi protein, sempurna untuk pembentukan otot. Dilengkapi sayuran organik panen lokal.",
    calories: "450 kcal",
    protein: "35g",
    price: "Rp 55.000",
    tags: ["High Protein", "Gluten Free"]
  },
  {
    id: 2,
    title: "Vegan Tofu Salad Bowl",
    description: "Segar dan mengenyangkan. Paduan tahu sutra organik dengan dressing wijen sangrai pilihan.",
    calories: "320 kcal",
    protein: "15g",
    price: "Rp 45.000",
    tags: ["Vegan", "Low Calorie"]
  },
  {
    id: 3,
    title: "Keto Beef Broccoli",
    description: "Sajian rendah karbohidrat dengan daging sapi premium grass-fed bebas lemak.",
    calories: "520 kcal",
    protein: "42g",
    price: "Rp 70.000",
    tags: ["Keto Friendly", "Low Carb"]
  }
];

export function FeaturedMenu() {
  return (
    <section id="menu" className="w-full py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Menu Andalan Minggu Ini</h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Disusun ahli gizi, diformulasikan oleh model prediksi bahan baku AI untuk kesegaran maksimal.
          </p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_MENUS.map((menu) => (
            <Card key={menu.id} className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 bg-white/50 backdrop-blur-sm border-white/40 shadow-sm border">
              <div className="h-48 w-full bg-muted flex items-center justify-center text-muted-foreground">
                <span className="text-sm">Gambar Menu</span>
              </div>
              <CardHeader className="p-5">
                <div className="flex gap-2 mb-2">
                  {menu.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <CardTitle>{menu.title}</CardTitle>
                <CardDescription className="line-clamp-2 mt-2 leading-relaxed">
                  {menu.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="flex items-center justify-between text-sm text-foreground/80 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-orange-100 text-orange-700 px-2 flex items-center h-6 rounded text-xs">{menu.calories}</span>
                    <span className="bg-blue-100 text-blue-700 px-2 flex items-center h-6 rounded text-xs">Protein: {menu.protein}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-5 pt-0 flex items-center justify-between">
                <span className="text-lg font-bold text-primary">{menu.price}</span>
                <Button size="sm">Tambah Keranjang</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="mt-12 flex justify-center">
          <Button variant="outline" size="lg" className="px-8">Lihat Semua Menu</Button>
        </div>
      </div>
    </section>
  );
}
