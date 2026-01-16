import {createTheme} from 'thememirror';
import {tags as t} from '@lezer/highlight';
const myTheme = createTheme({
	variant: 'dark',
	settings: {
		background: '#242424',
		foreground: '#c59df9',
		caret: '#4ff7d0',
		selection: 'rgba(48, 239, 182, 0.25)',
		selectionMatch: 'rgba(48, 239, 182, 0.15)',
		lineHighlight: '#0e5c45',
		gutterBackground: '#252525',
		gutterForeground: '#0f8260',
	},
	styles: [
		{
			tag: t.comment,
			color: '#676767',
		},
		{
			tag: t.variableName,
			color: '#30efb6',
		},
		{
			tag: [t.string, t.special(t.brace)],
			color: '#ccc460',
		},
		{
			tag: t.number,
			color: '#3cf0ff',
		},
		{
			tag: t.bool,
			color: '#1efdf8',
		},
		{
			tag: t.null,
			color: '#8679fd',
		},
		{
			tag: t.keyword,
			color: '#8679fd',
		},
		{
			tag: t.operator,
			color: '#ffffff',
		},
		{
			tag: t.className,
			color: '#30efb6',
		},
		{
			tag: t.definition(t.typeName),
			color: '#e6e6e6',
		},
		{
			tag: t.typeName,
			color: '#dfe0e1',
		},
		{
			tag: t.angleBracket,
			color: '#dc6a1f',
		},
		{
			tag: t.tagName,
			color: '#74fac5',
		},
		{
			tag: t.attributeName,
			color: '#ffffff',
		},
	],
});

export { myTheme };