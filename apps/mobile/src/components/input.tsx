import { TextInput, type TextInputProps } from 'react-native';

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#071C1466"
      {...props}
      className={`border border-ink-deep/30 bg-paper px-4 py-3 text-base text-ink-deep ${props.className ?? ''}`}
    />
  );
}
