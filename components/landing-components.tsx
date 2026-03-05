"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, BarChart3, Box, RotateCcw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: <Box className="size-6 text-blue-500" />,
    title: "Manajemen Inventaris",
    description: "Lacak dan kelola ribuan aset fisik secara terpusat dan efisien dengan labeling terpadu.",
  },
  {
    icon: <RotateCcw className="size-6 text-green-500" />,
    title: "Otomatisasi BAST",
    description: "Siklus peminjaman, mutasi, dan pengembalian tercatat otomatis lengkap dengan rekam jejak.",
  },
  {
    icon: <Wrench className="size-6 text-orange-500" />,
    title: "Siklus Perbaikan",
    description: "Integrasi menyeluruh pengelolaan perbaikan aset ke vendor dari rusak hingga kembali.",
  },
  {
    icon: <BarChart3 className="size-6 text-purple-500" />,
    title: "Analitik Cerdas",
    description: "Dapatkan wawasan mendalam kondisi aset anda lewat dashboard grafis real-time.",
  },
];

export function LandingHero() {
  return (
    <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>

      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
              <Zap className="size-4" />
              <span>Sistem Manajemen Aset Generasi Baru</span>
            </div>
          </motion.div>

          <motion.h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}>
            Kendalikan Aset Perusahaan Anda <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-blue-600">Tanpa Batas</span>
          </motion.h1>

          <motion.p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}>
            Platform Enterprise Asset Management System (EAMS) yang menggabungkan kecepatan, akurasi pencatatan BAST, dan visualisasi data yang elegan.
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}>
            <Button size="lg" className="h-14 px-8 text-base w-full sm:w-auto hover:scale-105 transition-transform" asChild>
              <Link href="/dashboard">
                Explore Dashboard <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base w-full sm:w-auto bg-background/50 backdrop-blur-sm" asChild>
              <Link href="/login">Sign In to Account</Link>
            </Button>
          </motion.div>

          <motion.div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-green-500" />
              <span>Type-Safe Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-yellow-500" />
              <span>Real-time Sync</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <div className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Dirancang untuk Efisiensi Skala Besar</h2>
          <p className="text-muted-foreground text-lg">Semua instrumen yang Anda butuhkan untuk memantau ratusan ribu aset hardware hingga properti dari satu layar kaca.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-background rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-colors" />
              <div className="mb-4 bg-muted size-12 rounded-xl flex items-center justify-center">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
