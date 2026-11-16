"use client";

import { Globe, DollarSign, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguages, useCurrencies } from "@/hooks";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import { CompanySwitcher } from "@/components/company-switcher";
import { useState, useEffect } from "react";

export function TopHeader() {
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const { user } = useAuth();
  const { data: languagesData } = useLanguages({ limit: 100 });
  const { data: currenciesData } = useCurrencies({ limit: 100 });

  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [mounted, setMounted] = useState(false);

  // Check if user is developer
  const isDeveloper = user?.role?.slug === 'developer';

  useEffect(() => {
    setMounted(true);
    // Load saved currency from cookie
    const match = document.cookie.match(/(?:^| )preferred_currency=([^;]+)/);
    if (match) setSelectedCurrency(decodeURIComponent(match[1]));
  }, []);

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
  };

  const handleCurrencyChange = (code: string) => {
    setSelectedCurrency(code);
    // Store in cookie (1 year expiry, accessible across subpaths)
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `preferred_currency=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  };

  const languages = languagesData?.data?.filter(l => l.is_active) || [];
  const currencies = currenciesData?.data?.filter(c => c.is_active) || [];

  const currentLanguage = languages.find(l => l.code === language) || languages[0];
  const currentCurrency = currencies.find(c => c.code === selectedCurrency) || currencies[0];

  if (!mounted) return null;

  return (
    <>
      <>
        <div className="flex items-center gap-0.5">
          {/* Company Switcher - Only for Developer */}
          {isDeveloper && (
            <CompanySwitcher />
          )}

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {currentLanguage?.code?.toUpperCase() || "EN"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[130px] sm:min-w-[150px]">
              {languages.length > 0 ? (
                languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.id}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={language === lang.code ? "bg-accent" : ""}
                  >
                    <span className="flex-1">{lang.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {lang.code.toUpperCase()}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  No languages available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Currency Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {currentCurrency?.code || "USD"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[130px] sm:min-w-[150px]">
              {currencies.length > 0 ? (
                currencies.map((currency) => (
                  <DropdownMenuItem
                    key={currency.id}
                    onClick={() => handleCurrencyChange(currency.code)}
                    className={selectedCurrency === currency.code ? "bg-accent" : ""}
                  >
                    <span className="mr-2">{currency.symbol}</span>
                    <span className="flex-1">{currency.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {currency.code}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  No currencies available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4 mr-2" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="h-4 w-4 mr-2" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </>
    </>
  );
}