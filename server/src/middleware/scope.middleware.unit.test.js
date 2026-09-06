import { describe, it, expect, vi } from 'vitest'
import { departmentScope, applyDepartmentScope } from './scope.middleware.js'
import { ApiError } from '../utils/api-error.js'

function makeReq(user) {
  return { user }
}

function makeRes() {
  return {}
}

function makeNext() {
  return vi.fn()
}

describe('Department Scoping Middleware (unit)', () => {
  it('sets departmentScope for coordinator', () => {
    const req = makeReq({
      role: 'coordinator',
      department: 'Computer Science & Engineering',
    })
    const next = makeNext()

    departmentScope(req, makeRes(), next)

    expect(req.departmentScope).toBe('Computer Science & Engineering')
    expect(next).toHaveBeenCalledWith()
  })

  it('sets departmentScope to null for TPO', () => {
    const req = makeReq({
      role: 'tpo',
      department: undefined,
    })
    const next = makeNext()

    departmentScope(req, makeRes(), next)

    expect(req.departmentScope).toBeNull()
    expect(next).toHaveBeenCalledWith()
  })

  it('sets departmentScope to null for student', () => {
    const req = makeReq({
      role: 'student',
      department: undefined,
    })
    const next = makeNext()

    departmentScope(req, makeRes(), next)

    expect(req.departmentScope).toBeNull()
    expect(next).toHaveBeenCalledWith()
  })

  it('throws CONFIG_ERROR for coordinator without department', () => {
    const req = makeReq({
      role: 'coordinator',
      department: undefined,
    })
    const next = makeNext()

    expect(() => departmentScope(req, makeRes(), next)).toThrow(ApiError)
    expect(next).not.toHaveBeenCalled()
  })

  it('throws AUTH_REQUIRED when req.user missing', () => {
    const req = makeReq(null)
    const next = makeNext()

    expect(() => departmentScope(req, makeRes(), next)).toThrow(ApiError)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('applyDepartmentScope helper', () => {
  it('adds department filter when scope provided', () => {
    const mockQuery = {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
    }
    const result = applyDepartmentScope(mockQuery, 'Computer Science & Engineering')

    expect(mockQuery.where).toHaveBeenCalledWith('department')
    expect(mockQuery.equals).toHaveBeenCalledWith('Computer Science & Engineering')
    expect(result).toBe(mockQuery)
  })

  it('returns query unchanged when scope is null', () => {
    const mockQuery = {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
    }
    const result = applyDepartmentScope(mockQuery, null)

    expect(mockQuery.where).not.toHaveBeenCalled()
    expect(mockQuery.equals).not.toHaveBeenCalled()
    expect(result).toBe(mockQuery)
  })

  it('returns query unchanged when scope is undefined', () => {
    const mockQuery = {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
    }
    const result = applyDepartmentScope(mockQuery, undefined)

    expect(mockQuery.where).not.toHaveBeenCalled()
    expect(result).toBe(mockQuery)
  })
})
