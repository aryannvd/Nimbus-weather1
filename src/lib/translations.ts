const dictionary: Record<string, Record<string, string>> = {
  en: {
    hourly_forecast: "Hourly Forecast",
    sunrise: "Sunrise",
    sunset: "Sunset",
    now: "Now",
    ten_day_forecast: "10-Day Forecast",
    today: "Today",
    max: "Max",
    min: "Min"
  },
  es: {
    hourly_forecast: "Pronóstico por Horas",
    sunrise: "Amanecer",
    sunset: "Atardecer",
    now: "Ahora",
    ten_day_forecast: "Pronóstico de 10 días",
    today: "Hoy",
    max: "Máx",
    min: "Mín"
  },
  fr: {
    hourly_forecast: "Prévisions par Heure",
    sunrise: "Lever du soleil",
    sunset: "Coucher du soleil",
    now: "Maintenant",
    ten_day_forecast: "Prévisions sur 10 jours",
    today: "Aujourd'hui",
    max: "Max",
    min: "Min"
  },
  de: {
    hourly_forecast: "Stündliche Vorhersage",
    sunrise: "Sonnenaufgang",
    sunset: "Sonnenuntergang",
    now: "Jetzt",
    ten_day_forecast: "10-Tage-Vorhersage",
    today: "Heute",
    max: "Max",
    min: "Min"
  },
  it: {
    hourly_forecast: "Previsioni Orarie",
    sunrise: "Alba",
    sunset: "Tramonto",
    now: "Ora",
    ten_day_forecast: "Previsioni a 10 Giorni",
    today: "Oggi",
    max: "Max",
    min: "Min"
  }
};

export function t(key: string, language: string = 'en'): string {
  const langKey = language?.toLowerCase().slice(0, 2) || 'en';
  const dict = dictionary[langKey] || dictionary.en;
  return dict[key] || key;
}

export function translateWmoCode(code: number, language: string = 'en'): string {
  const mappings: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Drizzle (Light)",
    53: "Drizzle (Moderate)",
    55: "Drizzle (Dense)",
    56: "Freezing Drizzle (Light)",
    57: "Freezing Drizzle (Dense)",
    61: "Rain (Slight)",
    63: "Rain (Moderate)",
    65: "Rain (Heavy)",
    66: "Freezing Rain (Light)",
    67: "Freezing Rain (Heavy)",
    71: "Snow fall (Slight)",
    73: "Snow fall (Moderate)",
    75: "Snow fall (Heavy)",
    77: "Snow grains",
    80: "Rain showers (Slight)",
    81: "Rain showers (Moderate)",
    82: "Rain showers (Violent)",
    85: "Snow showers (Slight)",
    86: "Snow showers (Heavy)",
    95: "Thunderstorm (Slight)",
    96: "Thunderstorm (Moderate)",
    99: "Thunderstorm (Heavy with hail)"
  };

  const text = mappings[code] || "Unknown condition";

  // Spanish
  if (language?.toLowerCase().startsWith('es')) {
    const esMappings: Record<number, string> = {
      0: "Cielo despejado",
      1: "Mayormente despejado",
      2: "Parcialmente nublado",
      3: "Nublado",
      45: "Niebla",
      48: "Niebla de rima",
      51: "Llovizna ligera",
      53: "Llovizna moderada",
      55: "Llovizna densa",
      56: "Llovizna congelante ligera",
      57: "Llovizna congelante densa",
      61: "Lluvia ligera",
      63: "Lluvia moderada",
      65: "Lluvia fuerte",
      66: "Lluvia congelante ligera",
      67: "Lluvia congelante fuerte",
      71: "Nieve ligera",
      73: "Nieve moderada",
      75: "Nieve fuerte",
      77: "Granos de nieve",
      80: "Chubascos de lluvia ligeros",
      81: "Chubascos de lluvia moderados",
      82: "Chubascos de lluvia violentos",
      85: "Chubascos de nieve ligeros",
      86: "Chubascos de nieve fuertes",
      95: "Tormenta ligera",
      96: "Tormenta moderada",
      99: "Tormenta fuerte con granizo"
    };
    return esMappings[code] || text;
  }

  // German
  if (language?.toLowerCase().startsWith('de')) {
    const deMappings: Record<number, string> = {
      0: "Klarer Himmel",
      1: "Überwiegend klar",
      2: "Teilweise bewölkt",
      3: "Bedeckt",
      45: "Nebel",
      48: "Raureifnebel",
      51: "Leichter Nieselregen",
      53: "Mäßiger Nieselregen",
      55: "Dichter Nieselregen",
      56: "Leichter gefrierender Nieselregen",
      57: "Dichter gefrierender Nieselregen",
      61: "Leichter Regen",
      63: "Mäßiger Regen",
      65: "Starker Regen",
      66: "Leichter gefrierender Regen",
      67: "Starker gefrierender Regen",
      71: "Leichter Schneefall",
      73: "Mäßiger Schneefall",
      75: "Starker Schneefall",
      77: "Schneegriesel",
      80: "Leichte Regenschauer",
      81: "Mäßige Regenschauer",
      82: "Heftige Regenschauer",
      85: "Leichte Schneeschauer",
      86: "Starke Schneeschauer",
      95: "Leichtes Gewitter",
      96: "Mäßiges Gewitter",
      99: "Schweres Gewitter mit Hagel"
    };
    return deMappings[code] || text;
  }

  // French
  if (language?.toLowerCase().startsWith('fr')) {
    const frMappings: Record<number, string> = {
      0: "Ciel dégagé",
      1: "Principalement dégagé",
      2: "Partiellement nuageux",
      3: "Couvert",
      45: "Brouillard",
      48: "Brouillard givrant",
      51: "Bruine légère",
      53: "Bruine modérée",
      55: "Bruine dense",
      56: "Bruine congelante légère",
      57: "Bruine congelante dense",
      61: "Pluie légère",
      63: "Pluie modérée",
      65: "Pluie forte",
      66: "Pluie congelante légère",
      67: "Pluie congelante forte",
      71: "Chute de neige légère",
      73: "Chute de neige modérée",
      75: "Chute de neige forte",
      77: "Neige en grains",
      80: "Averses de pluie légères",
      81: "Averses de pluie modérées",
      82: "Averses de pluie violentes",
      85: "Averses de neige légères",
      86: "Averses de neige fortes",
      95: "Orage léger",
      96: "Orage modéré",
      99: "Orage fort avec grêle"
    };
    return frMappings[code] || text;
  }

  return text;
}
