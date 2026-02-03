import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const roboto = Roboto({ weight: ['400'],
  subsets: ['latin'] 
})

export const metadata: Metadata = {
  title: 'To Do Manager',
  description: 'A simple to-do list manager with Google Calendar integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={roboto.className}>
                        <div className='h-screen w-screen flex flex-col' >
                          <Providers>
                            {children}
                          </Providers>
                        </div>      </body>
    </html>
  )
}
