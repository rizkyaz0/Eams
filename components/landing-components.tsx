"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, ShieldCheck, Zap, BarChart3, Box, RotateCcw, Wrench, BrainCircuit, RadioTower, ClipboardCheck, TrendingUp, Building2, Github, CheckCircle2, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** ------------------------------------------------------------------
 *  DATA
 * ------------------------------------------------------------------ */
const features = [
  {
    icon: <Box className="size-5 text-blue-500" />,
    title: "Manajemen Inventaris",
    description: "Lacak ribuan aset fisik secara terpusat dengan labeling QR dan RFID terpadu.",
    color: "blue",
  },
  {
    icon: <RotateCcw className="size-5 text-emerald-500" />,
    title: "Otomatisasi BAST",
    description: "Siklus peminjaman, mutasi, dan pengembalian tercatat otomatis lengkap dengan rekam jejak.",
    color: "emerald",
  },
  {
    icon: <Wrench className="size-5 text-orange-500" />,
    title: "Siklus Perbaikan",
    description: "Integrasi pengelolaan perbaikan aset ke vendor dari rusak hingga kembali beroperasi.",
    color: "orange",
  },
  {
    icon: <BarChart3 className="size-5 text-purple-500" />,
    title: "Analitik Real-Time",
    description: "Dapatkan wawasan mendalam kondisi aset lewat dashboard grafis interaktif.",
    color: "purple",
  },
  {
    icon: <BrainCircuit className="size-5 text-pink-500" />,
    title: "AI Predictive Maintenance",
    description: "Prediksi kegagalan aset sebelum terjadi menggunakan algoritma MTBF historis.",
    color: "pink",
  },
  {
    icon: <RadioTower className="size-5 text-cyan-500" />,
    title: "IoT & RFID Integration",
    description: "Pindai ratusan aset sekaligus via RFID gateway dan deteksi pergerakan tanpa izin.",
    color: "cyan",
  },
  {
    icon: <ClipboardCheck className="size-5 text-yellow-500" />,
    title: "Blind Stock-Take",
    description: "Audit opname kebutaan yang memastikan akurasi stok tanpa bias jumlah sistem.",
    color: "yellow",
  },
  {
    icon: <TrendingUp className="size-5 text-rose-500" />,
    title: "Engine Depresiasi",
    description: "Kalkulasi nilai buku aset secara otomatis menggunakan metode Straight-Line.",
    color: "rose",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "500+", label: "Aset Terpantau" },
  { value: "5s", label: "Scan RFID Bulk" },
  { value: "100%", label: "Type-Safe" },
];

const testimonials = [
  {
    name: "Suharta",
    role: "Kepala IT, Dinas Pendidikan Kota X",
    quote: "EAMS memotong waktu opname aset tahunan kami dari 3 minggu menjadi 2 hari. Luar biasa!",
    avatar: "AF",
  },
  {
    name: "Daffa Ahmad",
    role: "Asset Manager, PT. Konstruksi Nusantara",
    quote: "Fitur prediksi AI-nya benar-benar menyelamatkan kami dari downtime mesin senilai ratusan juta rupiah.",
    avatar: "SR",
  },
  {
    name: "Mubarok",
    role: "CTO, Startup Logistik",
    quote: "Deploy dalam hitungan menit, BAST digital menggantikan tumpukan kertas dan membuat audit menjadi mudah.",
    avatar: "BS",
  },
];

/** ------------------------------------------------------------------
 *  COMPONENTS
 * ------------------------------------------------------------------ */
export function LandingNav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Image src="/ikon.ico" alt="EAMS Logo" width={24} height={24} className="rounded-sm" />
          <span>EAMS</span>
          <Badge variant="outline" className="text-[10px] font-mono hidden sm:block">
            Enterprise
          </Badge>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">
            Fitur
          </a>
          <a href="#stats" className="hover:text-foreground transition-colors">
            Statistik
          </a>
          <a href="#testimonials" className="hover:text-foreground transition-colors">
            Testimoni
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Masuk</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard">
              Mulai Sekarang <ChevronRight className="size-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

export function LandingHero() {
  return (
    <div className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary/10 blur-3xl animate-pulse -z-10" />
      <div className="absolute -bottom-40 -left-40 size-[500px] rounded-full bg-blue-500/10 blur-3xl animate-pulse -z-10" style={{ animationDelay: "1s" }} />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="container px-4 mx-auto">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
              <Zap className="size-4 animate-pulse" />
              <span>Platform EAM Generasi Baru · Enterprise Edition v2.0</span>
            </div>
          </motion.div>

          <motion.h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            Kendalikan Aset Perusahaan Anda <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-blue-500 to-purple-500">Tanpa Batas.</span>
          </motion.h1>

          <motion.p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            Sistem Manajemen Aset Enterprise yang menggabungkan akurasi pencatatan BAST, pelacakan IoT/RFID, dan prediksi kecerdasan buatan dalam satu platform terpadu yang modern.
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Button size="lg" className="h-14 px-10 text-base w-full sm:w-auto group" asChild>
              <Link href="/dashboard">
                Jelajahi Dashboard
                <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 text-base w-full sm:w-auto bg-background/50 backdrop-blur-sm" asChild>
              <Link href="/login">Masuk ke Akun</Link>
            </Button>
          </motion.div>

          <motion.div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }}>
            {[
              { icon: <ShieldCheck className="size-4 text-emerald-500" />, text: "JWT Secured" },
              { icon: <Zap className="size-4 text-yellow-500" />, text: "Real-time IoT" },
              { icon: <BrainCircuit className="size-4 text-purple-500" />, text: "AI Predictive" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function LandingStats() {
  return (
    <div id="stats" className="py-16 border-y bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }}>
              <div className="text-4xl font-extrabold tracking-tight text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <div id="features" className="py-28">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Fitur Unggulan
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Dirancang untuk Efisiensi Skala Besar</h2>
          <p className="text-muted-foreground text-lg">Semua instrumen yang dibutuhkan untuk memantau ratusan ribu aset dari satu layar.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: idx * 0.06 }}
              className="bg-card rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-all duration-300 group cursor-default hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent to-primary/3 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-4 bg-muted size-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingTestimonials() {
  return (
    <div id="testimonials" className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Testimonials
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Dipercaya oleh Tim Terbaik</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="bg-card rounded-2xl p-6 border shadow-sm">
              <div className="flex mb-3 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-sm">
                    ★
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{t.avatar}</div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingCTA() {
  return (
    <div className="py-24">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden bg-linear-to-br from-primary/90 to-blue-600 p-12 md:p-20 text-white text-center shadow-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 relative z-10">Mulai Kelola Aset Anda Hari Ini</h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto relative z-10">Bergabunglah dengan ribuan organisasi yang telah mempercayakan pengelolaan aset mereka kepada EAMS.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <Button size="lg" variant="secondary" className="h-14 px-10 text-base bg-white text-primary hover:bg-white/90" asChild>
              <Link href="/dashboard">
                Buka Dashboard <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-white/70 relative z-10">
            {["Tidak perlu kartu kredit", "Setup dalam 5 menit", "Data tersimpan aman"].map((t, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-300" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container px-4 mx-auto py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-lg mb-3">
              <Image src="/ikon.ico" alt="EAMS Logo" width={24} height={24} className="rounded-sm" />
              EAMS
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Platform Enterprise Asset Management System modern yang membantu organisasi mengelola aset secara cerdas dan efisien.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Produk</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Dashboard", "Asset Management", "BAST Workflow", "Laporan"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Enterprise</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["AI Predictive", "IoT Integration", "Multi-Tier Approval", "Blind Stock-Take"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} EAMS. Enterprise Asset Management System.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
