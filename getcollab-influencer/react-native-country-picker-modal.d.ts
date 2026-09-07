declare module 'react-native-country-picker-modal' {
  import type { ComponentType } from 'react'

  export type CountryCode = string
  export type Country = { cca2: string; name: string | { common: string } }
  const CountryPicker: ComponentType<any>
  export default CountryPicker
}
