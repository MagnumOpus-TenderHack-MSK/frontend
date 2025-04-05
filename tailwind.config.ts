/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px"
            }
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))"
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))"
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))"
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))"
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))"
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))"
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))"
                },
                portal: {
                    red: "#D5303E",
                    blue: "#2F5AA8",
                    lightBlue: "#87CEEB"
                }
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)"
            },
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: '100%',
                        color: 'inherit',
                        p: {
                            marginTop: '0.75em',
                            marginBottom: '0.75em',
                        },
                        a: {
                            color: 'hsl(var(--primary))',
                            fontWeight: '500',
                            textDecoration: 'underline',
                            '&:hover': {
                                opacity: '0.8',
                            },
                        },
                        'ol, ul': {
                            paddingLeft: '1.25em',
                        },
                        'h1, h2, h3, h4, h5, h6': {
                            fontWeight: '600',
                            marginTop: '1.5em',
                            marginBottom: '0.75em',
                        },
                        pre: {
                            backgroundColor: 'hsl(var(--muted))',
                            borderRadius: '0.375rem',
                            padding: '0.75rem 1rem',
                            overflowX: 'auto',
                        },
                        code: {
                            backgroundColor: 'hsl(var(--muted))',
                            borderRadius: '0.25rem',
                            padding: '0.25rem 0.4rem',
                            fontSize: '0.875em',
                        },
                    },
                },
            },
        }
    },
    plugins: [
        require('@tailwindcss/typography'),
    ]
}