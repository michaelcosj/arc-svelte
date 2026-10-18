/**
 * Lets an app swap the link and image elements Arc components render (kuratlielia/arc-library#13).
 *
 * Without a provider, Arc renders a plain `<a>` and `<img>`. Wrap the app once to use your own
 * components instead:
 *
 *   <ArcProvider link={MyLink} image={MyImage}>{@render children()}</ArcProvider>
 *
 * Or call `setArcComponents({ link, image })` in a layout. Nested providers inherit what they do
 * not set.
 */
import { createContext } from 'svelte';
import type { Component, Snippet } from 'svelte';
import type { HTMLAnchorAttributes, HTMLImgAttributes } from 'svelte/elements';

/** The props Arc passes to a link: an href plus ordinary anchor attributes. */
export interface ArcLinkProps extends HTMLAnchorAttributes {
	href: string;
	ref?: HTMLAnchorElement | null;
	children?: Snippet;
}

/**
 * The props Arc passes to an image: either `fill` (cover the positioned parent) or `width` and
 * `height`, plus `sizes` and `priority` as hints.
 */
export interface ArcImageProps extends Omit<
	HTMLImgAttributes,
	'src' | 'alt' | 'width' | 'height' | 'loading' | 'srcset'
> {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	/** Fills the nearest positioned parent. */
	fill?: boolean;
	/** Loads the image eagerly with high priority. */
	priority?: boolean;
	loading?: 'eager' | 'lazy';
	ref?: HTMLImageElement | null;
}

export type ArcLinkComponent = Component<ArcLinkProps, object, 'ref'>;
export type ArcImageComponent = Component<ArcImageProps, object, 'ref'>;

export interface ArcComponents {
	/** The link component Arc renders for navigation. Defaults to `<a>`. */
	link?: ArcLinkComponent;
	/** The image component Arc renders for photos. Defaults to `<img>`. */
	image?: ArcImageComponent;
}

const [getContext, setContext] = createContext<ArcComponents>();

/** The components from the nearest provider; either may be undefined (use the plain element). */
export function getArcComponents(): ArcComponents {
	try {
		return getContext() ?? {};
	} catch {
		return {};
	}
}

/** Sets the link and image components for every Arc component below. Call during component init. */
export function setArcComponents(components: ArcComponents) {
	const parent = getArcComponents();
	return setContext({
		get link() {
			return components.link ?? parent.link;
		},
		get image() {
			return components.image ?? parent.image;
		}
	});
}
