const chroma = require('chroma-js');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const colors = require('tailwindcss/colors');
const plugin = require('tailwindcss/plugin');
const flattenColorPalette =
    require('tailwindcss/lib/util/flattenColorPalette').default;
const generateContrasts = require(
    path.resolve(__dirname, '../utils/generate-contrasts')
);
const jsonToSassMap = require(
    path.resolve(__dirname, '../utils/json-to-sass-map')
);

// -----------------------------------------------------------------------------------------------------
// @ Utilities
// -----------------------------------------------------------------------------------------------------

/**
 * Normalizes the provided theme by omitting empty values and values that
 * start with "on" from each palette. Also sets the correct DEFAULT value
 * of each palette.
 *
 * @param theme
 */
const normalizeTheme = (theme) => {
    return _.fromPairs(
        _.map(
            _.omitBy(
                theme,
                (palette, paletteName) =>
                    paletteName.startsWith('on') || _.isEmpty(palette)
            ),
            (palette, paletteName) => [
                paletteName,
                {
                    ...palette,
                    DEFAULT: palette['DEFAULT'] || palette[500],
                },
            ]
        )
    );
};

// -----------------------------------------------------------------------------------------------------
// @ FUSE TailwindCSS Main Plugin
// -----------------------------------------------------------------------------------------------------
const theming = plugin.withOptions(
    (options) =>
        ({ addComponents, e, theme }) => {
            /**
             * Create user themes object by going through the provided themes and
             * merging them with the provided "default" so, we can have a complete
             * set of color palettes for each user theme.
             */
            const userThemes = _.fromPairs(
                _.map(options.themes, (theme, themeName) => [
                    themeName,
                    _.defaults({}, theme, options.themes['default']),
                ])
            );

            /**
             * Normalize the themes and assign it to the themes object. This will
             * be the final object that we create a SASS map from
             */
            let themes = _.fromPairs(
                _.map(userThemes, (theme, themeName) => [
                    themeName,
                    normalizeTheme(theme),
                ])
            );

            /**
             * Go through the themes to generate the contrasts and filter the
             * palettes to only have "primary", "accent" and "warn" objects.
             */
            themes = _.fromPairs(
                _.map(themes, (theme, themeName) => [
                    themeName,
                    _.pick(
                        _.fromPairs(
                            _.map(theme, (palette, paletteName) => [
                                paletteName,
                                {
                                    ...palette,
                                    contrast: _.fromPairs(
                                        _.map(
                                            generateContrasts(palette),
                                            (color, hue) => [
                                                hue,
                                                _.get(userThemes[themeName], [
                                                    `on-${paletteName}`,
                                                    hue,
                                                ]) || color,
                                            ]
                                        )
                                    ),
                                },
                            ])
                        ),
                        ['primary', 'accent', 'warn']
                    ),
                ])
            );

            /**
             * Go through the themes and attach appropriate class selectors so,
             * we can use them to encapsulate each theme.
             */
            themes = _.fromPairs(
                _.map(themes, (theme, themeName) => [
                    themeName,
                    {
                        selector: `".theme-${themeName}"`,
                        ...theme,
                    },
                ])
            );

            /* Generate the SASS map using the themes object */
            const sassMap = jsonToSassMap(
                JSON.stringify({ 'user-themes': themes })
            );

            /* Get the file path */
            const filename = path.resolve(
                __dirname,
                '../../styles/user-themes.scss'
            );

            /* Read the file and get its data */
            let data;
            try {
                data = fs.readFileSync(filename, { encoding: 'utf8' });
            } catch (err) {
                console.error(err);
            }

            /* Write the file if the map has been changed */
            if (data !== sassMap) {
                try {
                    fs.writeFileSync(filename, sassMap, { encoding: 'utf8' });
                } catch (err) {
                    console.error(err);
                }
            }

            /**
             * Iterate through the user's themes and build Tailwind components containing
             * CSS Custom Properties using the colors from them. This allows switching
             * themes by simply replacing a class name as well as nesting them.
             */
            addComponents(
                _.fromPairs(
                    _.map(options.themes, (theme, themeName) => [
                        themeName === 'default'
                            ? 'body, .theme-default'
                            : `.theme-${e(themeName)}`,
                        _.fromPairs(
                            _.flatten(
                                _.map(
                                    flattenColorPalette(
                                        _.fromPairs(
                                            _.flatten(
                                                _.map(
                                                    normalizeTheme(theme),
                                                    (palette, paletteName) => [
                                                        [
                                                            e(paletteName),
                                                            palette,
                                                        ],
                                                        [
                                                            `on-${e(paletteName)}`,
                                                            _.fromPairs(
                                                                _.map(
                                                                    generateContrasts(
                                                                        palette
                                                                    ),
                                                                    (
                                                                        color,
                                                                        hue
                                                                    ) => [
                                                                        hue,
                                                                        _.get(
                                                                            theme,
                                                                            [
                                                                                `on-${paletteName}`,
                                                                                hue,
                                                                            ]
                                                                        ) ||
                                                                            color,
                                                                    ]
                                                                )
                                                            ),
                                                        ],
                                                    ]
                                                )
                                            )
                                        )
                                    ),
                                    (value, key) => [
                                        [`--fuse-${e(key)}`, value],
                                        [
                                            `--fuse-${e(key)}-rgb`,
                                            chroma(value).rgb().join(','),
                                        ],
                                    ]
                                )
                            )
                        ),
                    ])
                )
            );

            /**
             * Generate scheme based css custom properties and utility classes
             */
            const schemeCustomProps = _.map(
                ['light', 'dark'],
                (colorScheme) => {
                    const isDark = colorScheme === 'dark';
                    const background = theme(
                        `fuse.customProps.background.${colorScheme}`
                    );
                    const foreground = theme(
                        `fuse.customProps.foreground.${colorScheme}`
                    );
                    const lightSchemeSelectors =
                        'body.light, .light, .dark .light';
                    const darkSchemeSelectors =
                        'body.dark, .dark, .light .dark';

                    return {
                        [isDark ? darkSchemeSelectors : lightSchemeSelectors]: {
                            /**
                             * If a custom property is not available, browsers will use
                             * the fallback value. In this case, we want to use '--is-dark'
                             * as the indicator of a dark theme so, we can use it like this:
                             * background-color: var(--is-dark, red);
                             *
                             * If we set '--is-dark' as "true" on dark themes, the above rule
                             * won't work because of the said "fallback value" logic. Therefore,
                             * we set the '--is-dark' to "false" on light themes and not set it
                             * at all on dark themes so that the fallback value can be used on
                             * dark themes.
                             *
                             * On light themes, since '--is-dark' exists, the above rule will be
                             * interpolated as:
                             * "background-color: false"
                             *
                             * On dark themes, since '--is-dark' doesn't exist, the fallback value
                             * will be used ('red' in this case) and the rule will be interpolated as:
                             * "background-color: red"
                             *
                             * It's easier to understand and remember like this.
                             */
                            ...(!isDark ? { '--is-dark': 'false' } : {}),

                            /* Generate custom properties from customProps */
                            ..._.fromPairs(
                                _.flatten(
                                    _.map(background, (value, key) => [
                                        [`--fuse-${e(key)}`, value],
                                        [
                                            `--fuse-${e(key)}-rgb`,
                                            chroma(value).rgb().join(','),
                                        ],
                                    ])
                                )
                            ),
                            ..._.fromPairs(
                                _.flatten(
                                    _.map(foreground, (value, key) => [
                                        [`--fuse-${e(key)}`, value],
                                        [
                                            `--fuse-${e(key)}-rgb`,
                                            chroma(value).rgb().join(','),
                                        ],
                                    ])
                                )
                            ),
                        },
                    };
                }
            );

            const schemeUtilities = (() => {
                /* Generate general styles & utilities */
                return {};
            })();

            addComponents(schemeCustomProps);
            addComponents(schemeUtilities);
        },
    (options) => {
        return {
            theme: {
                extend: {
                    /**
                     * Add 'Primary', 'Accent' and 'Warn' palettes as colors so all color utilities
                     * are generated for them; "bg-primary", "text-on-primary", "bg-accent-600" etc.
                     * This will also allow using arbitrary values with them such as opacity and such.
                     */
                    colors: _.fromPairs(
                        _.flatten(
                            _.map(
                                _.keys(
                                    flattenColorPalette(
                                        normalizeTheme(options.themes.default)
                                    )
                                ),
                                (name) => [
                                    [
                                        name,
                                        `rgba(var(--fuse-${name}-rgb), <alpha-value>)`,
                                    ],
                                    [
                                        `on-${name}`,
                                        `rgba(var(--fuse-on-${name}-rgb), <alpha-value>)`,
                                    ],
                                ]
                            )
                        )
                    ),
                },
                fuse: {
                    customProps: {
                        background: {
                            light: {
                                'bg-app-bar': '#FFFFFF',
                                'bg-card': '#FFFFFF',
                                'bg-default': colors.slate[100],
                                'bg-dialog': '#FFFFFF',
                                'bg-hover': chroma(colors.slate[400])
                                    .alpha(0.12)
                                    .css(),
                                'bg-status-bar': colors.slate[300],
                            },
                            dark: {
                                'bg-app-bar': colors.slate[900],
                                'bg-card': colors.slate[800],
                                'bg-default': colors.slate[900],
                                'bg-dialog': colors.slate[800],
                                'bg-hover': 'rgba(255, 255, 255, 0.05)',
                                'bg-status-bar': colors.slate[900],
                            },
                        },
                        foreground: {
                            light: {
                                'text-default': colors.slate[800],
                                'text-secondary': colors.slate[500],
                                'text-hint': colors.slate[400],
                                'text-disabled': colors.slate[400],
                                border: colors.slate[200],
                                divider: colors.slate[200],
                                icon: colors.slate[500],
                                'mat-icon': colors.slate[500],
                            },
                            dark: {
                                'text-default': '#FFFFFF',
                                'text-secondary': colors.slate[400],
                                'text-hint': colors.slate[500],
                                'text-disabled': colors.slate[600],
                                border: chroma(colors.slate[100])
                                    .alpha(0.12)
                                    .css(),
                                divider: chroma(colors.slate[100])
                                    .alpha(0.12)
                                    .css(),
                                icon: colors.slate[400],
                                'mat-icon': colors.slate[400],
                            },
                        },
                    },
                },
            },
        };
    }
);

module.exports = theming;
