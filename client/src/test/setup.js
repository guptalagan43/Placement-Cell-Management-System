import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// globals:false means RTL's automatic afterEach cleanup isn't registered, so
// unmount rendered trees between tests explicitly.
afterEach(() => {
  cleanup()
})
