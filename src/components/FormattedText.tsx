import { Anchor, Text, type TextProps } from '@mantine/core';
import { Link } from 'react-router-dom';

type FormattedTextProps = Omit<TextProps, 'children'> & {
  children: string;
  monsterIds?: Map<string, number>;
};

function renderMarkup(value: string, monsterIds?: Map<string, number>) {
  const monsterPattern = monsterIds?.size
    ? new RegExp(`(${[...monsterIds.keys()].sort((a, b) => b.length - a.length).join('|')})`, 'gu')
    : undefined;
  return value.split(/(≪[^≪≫]+≫)/g).map((segment, index) => {
    if (!segment.startsWith('≪') || !segment.endsWith('≫')) {
      if (!monsterPattern) return segment;
      return segment.split(monsterPattern).map((part, partIndex) => {
        const monsterId = monsterIds?.get(part);
        return monsterId === undefined
          ? part
          : <Anchor key={`${index}-${partIndex}`} component={Link} to={`/monsters/${monsterId}`}>{part}</Anchor>;
      });
    }

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

export function FormattedText({ children, className, monsterIds, ...props }: FormattedTextProps) {
  return (
    <Text {...props} className={['formatted-text', className].filter(Boolean).join(' ')}>
      {renderMarkup(children, monsterIds)}
    </Text>
  );
}
