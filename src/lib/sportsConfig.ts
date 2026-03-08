  import { Sport } from "@/types/registration"

  export const sportsConfig: Sport[] = [
    // =========================
    // 1) PENCAK SILAT (TAPAK SUCI)
    // =========================
    {
      id: "silat",
      name: "Pencak Silat (Tapak Suci)",
      categories: [
        // SMP/MTs - Tanding Putra
        { id: "silat_smp_tanding_putra_36_39", label: "SMP/MTs Tanding Putra 36–39 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putra_39_42", label: "SMP/MTs Tanding Putra 39–42 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putra_42_45", label: "SMP/MTs Tanding Putra 42–45 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putra_45_48", label: "SMP/MTs Tanding Putra 45–48 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putra_48_51", label: "SMP/MTs Tanding Putra 48–51 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putra_51_54", label: "SMP/MTs Tanding Putra 51–54 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putra_54_57", label: "SMP/MTs Tanding Putra 54–57 kg", type: "individu", quota: 0 },

        // SMP/MTs - Tanding Putri
        { id: "silat_smp_tanding_putri_36_39", label: "SMP/MTs Tanding Putri 36–39 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putri_39_42", label: "SMP/MTs Tanding Putri 39–42 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putri_42_45", label: "SMP/MTs Tanding Putri 42–45 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putri_45_48", label: "SMP/MTs Tanding Putri 45–48 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putri_48_51", label: "SMP/MTs Tanding Putri 48–51 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putri_51_54", label: "SMP/MTs Tanding Putri 51–54 kg", type: "individu", quota: 0 },
        { id: "silat_smp_tanding_putri_54_57", label: "SMP/MTs Tanding Putri 54–57 kg", type: "individu", quota: 0 },

        // SMP/MTs - Seni
        { id: "silat_smp_seni_tunggal", label: "SMP/MTs Seni Tunggal Tangan Kosong (Tapak Suci)", type: "individu", quota: 0 },
        { id: "silat_smp_seni_ganda", label: "SMP/MTs Seni Ganda (IPSI)", type: "ganda", quota: 0 },

        // SMA/SMK/MA - Tanding Putra
        { id: "silat_sma_tanding_putra_43_47", label: "SMA/SMK/MA Tanding Putra 43–47 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putra_47_51", label: "SMA/SMK/MA Tanding Putra 47–51 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putra_51_55", label: "SMA/SMK/MA Tanding Putra 51–55 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putra_55_59", label: "SMA/SMK/MA Tanding Putra 55–59 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putra_59_63", label: "SMA/SMK/MA Tanding Putra 59–63 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putra_63_67", label: "SMA/SMK/MA Tanding Putra 63–67 kg", type: "individu", quota: 0 },

        // SMA/SMK/MA - Tanding Putri
        { id: "silat_sma_tanding_putri_43_47", label: "SMA/SMK/MA Tanding Putri 43–47 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putri_47_51", label: "SMA/SMK/MA Tanding Putri 47–51 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putri_51_55", label: "SMA/SMK/MA Tanding Putri 51–55 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putri_55_59", label: "SMA/SMK/MA Tanding Putri 55–59 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putri_59_63", label: "SMA/SMK/MA Tanding Putri 59–63 kg", type: "individu", quota: 0 },
        { id: "silat_sma_tanding_putri_63_67", label: "SMA/SMK/MA Tanding Putri 63–67 kg", type: "individu", quota: 0 },

        // SMA/SMK/MA - Seni
        { id: "silat_sma_seni_tunggal", label: "SMA/SMK/MA Seni Tunggal Tangan Kosong", type: "individu", quota: 0 },
        { id: "silat_sma_seni_ganda", label: "SMA/SMK/MA Seni Ganda (IPSI)", type: "ganda", quota: 0 },

        // Mahasiswa - Tanding Putra
        { id: "silat_mhs_tanding_putra_45_50", label: "Mahasiswa Tanding Putra 45–50 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putra_50_55", label: "Mahasiswa Tanding Putra 50–55 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putra_55_60", label: "Mahasiswa Tanding Putra 55–60 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putra_60_65", label: "Mahasiswa Tanding Putra 60–65 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putra_65_70", label: "Mahasiswa Tanding Putra 65–70 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putra_70_75", label: "Mahasiswa Tanding Putra 70–75 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putra_75_80", label: "Mahasiswa Tanding Putra 75–80 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putra_80_85", label: "Mahasiswa Tanding Putra 80–85 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putra_85_90", label: "Mahasiswa Tanding Putra 85–90 kg", type: "individu", quota: 0 },

        // Mahasiswa - Tanding Putri
        { id: "silat_mhs_tanding_putri_45_50", label: "Mahasiswa Tanding Putri 45–50 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putri_50_55", label: "Mahasiswa Tanding Putri 50–55 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putri_55_60", label: "Mahasiswa Tanding Putri 55–60 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putri_60_65", label: "Mahasiswa Tanding Putri 60–65 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putri_65_70", label: "Mahasiswa Tanding Putri 65–70 kg", type: "individu", quota: 0 },
        { id: "silat_mhs_tanding_putri_70_75", label: "Mahasiswa Tanding Putri 70–75 kg", type: "individu", quota: 0 },

        // Mahasiswa - Bebas Beregu (anggap tim, input kuota = jumlah tim)
        { id: "silat_mhs_bebas_beregu_putra", label: "Mahasiswa Bebas Beregu Putra (5 atlet, bertanding 3)", type: "tim", quota: 0 },
        { id: "silat_mhs_bebas_beregu_putri", label: "Mahasiswa Bebas Beregu Putri (5 atlet, bertanding 3)", type: "tim", quota: 0 },

        // Mahasiswa - Seni
        { id: "silat_mhs_seni_tunggal", label: "Mahasiswa Seni Tunggal Tangan Kosong", type: "individu", quota: 0 },
        { id: "silat_mhs_seni_ganda", label: "Mahasiswa Seni Ganda (IPSI)", type: "ganda", quota: 0 },
      ],
    },

    // =========================
    // 2) ATLETIK
    // =========================
    {
      id: "atletik",
      name: "Atletik",
      categories: [
        // SMP
        { id: "atletik_smp_100m_putra", label: "SMP 100 meter Putra", type: "individu", quota: 0 },
        { id: "atletik_smp_100m_putri", label: "SMP 100 meter Putri", type: "individu", quota: 0 },
        { id: "atletik_smp_400m_putra", label: "SMP 400 meter Putra", type: "individu", quota: 0 },
        { id: "atletik_smp_400m_putri", label: "SMP 400 meter Putri", type: "individu", quota: 0 },
        { id: "atletik_smp_800m_putra", label: "SMP 800 meter Putra", type: "individu", quota: 0 },
        { id: "atletik_smp_800m_putri", label: "SMP 800 meter Putri", type: "individu", quota: 0 },
        { id: "atletik_smp_estafet_4x400_putra", label: "SMP Estafet 4x400 Putra", type: "tim", quota: 0 },
        { id: "atletik_smp_estafet_4x400_putri", label: "SMP Estafet 4x400 Putri", type: "tim", quota: 0 },
        { id: "atletik_smp_lompat_jauh_putra", label: "SMP Lompat Jauh Putra", type: "individu", quota: 0 },
        { id: "atletik_smp_lompat_jauh_putri", label: "SMP Lompat Jauh Putri", type: "individu", quota: 0 },
        { id: "atletik_smp_tolak_peluru_putra", label: "SMP Tolak Peluru Putra", type: "individu", quota: 0 },
        { id: "atletik_smp_tolak_peluru_putri", label: "SMP Tolak Peluru Putri", type: "individu", quota: 0 },

        // SMA
        { id: "atletik_sma_100m_putra", label: "SMA 100 meter Putra", type: "individu", quota: 0 },
        { id: "atletik_sma_100m_putri", label: "SMA 100 meter Putri", type: "individu", quota: 0 },
        { id: "atletik_sma_400m_putra", label: "SMA 400 meter Putra", type: "individu", quota: 0 },
        { id: "atletik_sma_400m_putri", label: "SMA 400 meter Putri", type: "individu", quota: 0 },
        { id: "atletik_sma_800m_putra", label: "SMA 800 meter Putra", type: "individu", quota: 0 },
        { id: "atletik_sma_800m_putri", label: "SMA 800 meter Putri", type: "individu", quota: 0 },
        { id: "atletik_sma_estafet_4x400_putra", label: "SMA Estafet 4x400 Putra", type: "tim", quota: 0 },
        { id: "atletik_sma_estafet_4x400_putri", label: "SMA Estafet 4x400 Putri", type: "tim", quota: 0 },
        { id: "atletik_sma_lompat_jauh_putra", label: "SMA Lompat Jauh Putra", type: "individu", quota: 0 },
        { id: "atletik_sma_lompat_jauh_putri", label: "SMA Lompat Jauh Putri", type: "individu", quota: 0 },
        { id: "atletik_sma_tolak_peluru_putra", label: "SMA Tolak Peluru Putra", type: "individu", quota: 0 },
        { id: "atletik_sma_tolak_peluru_putri", label: "SMA Tolak Peluru Putri", type: "individu", quota: 0 },

        // Mahasiswa
        { id: "atletik_mhs_100m_putra", label: "Mahasiswa 100 meter Putra", type: "individu", quota: 0 },
        { id: "atletik_mhs_100m_putri", label: "Mahasiswa 100 meter Putri", type: "individu", quota: 0 },
        { id: "atletik_mhs_400m_putra", label: "Mahasiswa 400 meter Putra", type: "individu", quota: 0 },
        { id: "atletik_mhs_400m_putri", label: "Mahasiswa 400 meter Putri", type: "individu", quota: 0 },
      ],
    },

    // =========================
    // 3) PANAHAN
    // =========================
    {
      id: "panahan",
      name: "Panahan",
      categories: [
        // Standar Nasional
        { id: "panahan_standar_sd_20m", label: "Standar Nasional SD (20 m)", type: "individu", quota: 0 },
        { id: "panahan_standar_smp_30m", label: "Standar Nasional SMP (30 m)", type: "individu", quota: 0 },

        // Barebow
        { id: "panahan_barebow_sd_10m", label: "Barebow SD (10 m)", type: "individu", quota: 0 },
        { id: "panahan_barebow_smp_sma_20m", label: "Barebow SMP–SMA (20 m)", type: "individu", quota: 0 },

        // Recurve
        { id: "panahan_recurve_smp_sma_60m", label: "Recurve SMP–SMA (60 m)", type: "individu", quota: 0 },
        { id: "panahan_recurve_mhs_70m", label: "Recurve Mahasiswa (70 m)", type: "individu", quota: 0 },

        // Compound
        { id: "panahan_compound_smp_sma_50m", label: "Compound SMP–SMA (50 m)", type: "individu", quota: 0 },

        // Horsebow
        { id: "panahan_horsebow_sd_10m", label: "Horsebow SD (10 m)", type: "individu", quota: 0 },
        { id: "panahan_horsebow_smp_20m", label: "Horsebow SMP (20 m)", type: "individu", quota: 0 },
        { id: "panahan_horsebow_mhs_30m", label: "Horsebow Mahasiswa (30 m)", type: "individu", quota: 0 },
      ],
    },

    // =========================
    // 4) BULU TANGKIS
    // =========================
    {
      id: "badminton",
      name: "Bulu Tangkis",
      categories: [
        // SMP - Perorangan
        { id: "bt_smp_tunggal_putra", label: "SMP Tunggal Putra", type: "individu", quota: 0 },
        { id: "bt_smp_tunggal_putri", label: "SMP Tunggal Putri", type: "individu", quota: 0 },
        { id: "bt_smp_ganda_putra", label: "SMP Ganda Putra", type: "ganda", quota: 0 },
        { id: "bt_smp_ganda_putri", label: "SMP Ganda Putri", type: "ganda", quota: 0 },

        // SMP - Beregu
        { id: "bt_smp_beregu_putra", label: "SMP Beregu Putra", type: "tim", quota: 0 },
        { id: "bt_smp_beregu_putri", label: "SMP Beregu Putri", type: "tim", quota: 0 },

        // SMA - Perorangan
        { id: "bt_sma_tunggal_putra", label: "SMA Tunggal Putra", type: "individu", quota: 0 },
        { id: "bt_sma_tunggal_putri", label: "SMA Tunggal Putri", type: "individu", quota: 0 },
        { id: "bt_sma_ganda_putra", label: "SMA Ganda Putra", type: "ganda", quota: 0 },
        { id: "bt_sma_ganda_putri", label: "SMA Ganda Putri", type: "ganda", quota: 0 },

        // SMA - Beregu
        { id: "bt_sma_beregu_putra", label: "SMA Beregu Putra", type: "tim", quota: 0 },
        { id: "bt_sma_beregu_putri", label: "SMA Beregu Putri", type: "tim", quota: 0 },
      ],
    },

    // =========================
    // 5) TENIS MEJA
    // =========================
    {
      id: "tenismeja",
      name: "Tenis Meja",
      categories: [
        // Perorangan
        { id: "tm_tunggal_putra", label: "Tunggal Putra", type: "individu", quota: 0 },
        { id: "tm_tunggal_putri", label: "Tunggal Putri", type: "individu", quota: 0 },
        { id: "tm_ganda_putra", label: "Ganda Putra", type: "ganda", quota: 0 },
        { id: "tm_ganda_putri", label: "Ganda Putri", type: "ganda", quota: 0 },
        { id: "tm_ganda_campuran", label: "Ganda Campuran", type: "ganda", quota: 0 },

        // Beregu
        { id: "tm_beregu_putra", label: "Beregu Putra", type: "tim", quota: 0 },
        { id: "tm_beregu_putri", label: "Beregu Putri", type: "tim", quota: 0 },
      ],
    },

    // =========================
    // 6) VOLI INDOOR
    // =========================
    {
      id: "voli",
      name: "Voli Indoor",
      categories: [
        { id: "voli_beregu_putra", label: "Beregu Putra", type: "tim", quota: 0 },
        { id: "voli_beregu_putri", label: "Beregu Putri", type: "tim", quota: 0 },
      ],
    },
  ]
    