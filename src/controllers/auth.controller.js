import { prisma } from '../db.js'
import bcrypt from 'bcryptjs'
import { createAccessToken } from '../libs/jwt.js'
import jwt from 'jsonwebtoken'
import { TOKEN_SECRET } from '../config.js'

export const register = async (req, res) => {
  const { email, password, username } = req.body

  try {
    const userFound = await prisma.user.findUnique({
      where: { email }
    })
    if (userFound) {
      return res.status(400).json(['The email is already in use'])
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: passwordHash
      }
    })

    const token = await createAccessToken({ id: newUser.id })

    res.cookie('token', token)
    res.json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const login = async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return res.status(400).json(['User not found'])
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(400).json(['Invalid password'])
    }

    const token = await createAccessToken({ id: user.id })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    res.json({message: 'Login successfull'})
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const logout = (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logout successful' })
}

export const profile = async (req, res) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json(['Unauthorized'])
  }

  try {
    const decoded = jwt.verify(token, TOKEN_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    })

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const verifyToken = async (req, res) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json(['Unauthorized'])
  }

  try {
    jwt.verify(token, TOKEN_SECRET)
    res.json({ message: 'Token is valid' })
  } catch (err) {
    res.status(401).json(['Unauthorized'])
  }
}
