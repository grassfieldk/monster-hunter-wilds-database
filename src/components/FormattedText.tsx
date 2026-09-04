import { Text, type TextProps } from '@mantine/core';

type FormattedTextProps = Omit<TextProps, 'children'> & {
  children: string;
};

function renderMarkup(value: string) {
  return value.split(/(≪[^≪≫]+≫)/g).map((segment, index) => {
    if (!segment.startsWith('≪') || !segment.endsWith('≫')) return segment;

    const content = segment.slice(1, -1);
    const reading = content.match(/^(.+?)（(.+?)）$/u);
    if (!reading) return <strong key={index}>{content}</strong>;

    return (
      <strong key={index}>
        <ruby>
          {reading[1]}
          <rt>{reading[2]}</rt>
        </ruby>
      </strong>
    );
  });
}

export function FormattedText({ children, className, ...props }: FormattedTextProps) {
  return (
    <Text {...props} className={['formatted-text', className].filter(Boolean).join(' ')}>
      {renderMarkup(children)}
    </Text>
  );
}
