"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export default function Home() {
  const [language, setLanguage] = useState<"en" | "zh">("en")

  // Detect user's system language on component mount
  useEffect(() => {
    const userLanguage = navigator.language || (navigator as any).userLanguage
    if (userLanguage && userLanguage.startsWith("zh")) {
      setLanguage("zh")
    }
  }, [])

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en")
  }

  const content = {
    en: {
      title: "Say Hello to BamBot! 👋",
      subtitle: "Open source, low-cost (~$300) humanoid robot",
      buildButton: "Build Your Own! 🛠️",
      actionButton: "See It In Action ✨",
      community: "Join our growing robot community! 🌱",
      footer: "Built with ❤️ by timqian © 2025",
      languageToggle: "Switch to Chinese",
    },
    zh: {
      title: "你好，我是 Bambot 👋",
      subtitle: "一个开源、低成本的（~¥2000）人形机器人",
      buildButton: "自己动手制作! 🛠️",
      actionButton: "查看演示 ✨",
      community: "加入我们的机器人社区! 🌱",
      footer: "Built with ❤️ by timqian © 2025",
      languageToggle: "切换到英文",
    },
  }

  const t = content[language]

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-green-50">
      <header className="container mx-auto p-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-green-600">BamBot</div>
        <button
          onClick={toggleLanguage}
          className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors"
          aria-label={t.languageToggle}
          title={t.languageToggle}
        >
          <div className="w-6 h-6 flex items-center justify-center border-2 border-current rounded-full font-bold text-sm">
            文
          </div>
        </button>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-green-700">{t.title}</h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl text-gray-600">{t.subtitle}</p>

        <div className="relative w-full max-w-lg aspect-square mb-8">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ceea02b714f82b5f87a1c2222d609e87.JPG-LgPzJpt4vTIfIjNfUDKcyr27yDbaT4.jpeg"
            alt="BamBot - A green robotic assistant holding a sunflower and a basket"
            fill
            className="object-contain"
            priority
          />
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <a href="https://github.com/timqian/bambot"><Button className="bg-green-600 hover:bg-green-700">{t.buildButton}</Button></a>
          <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            {t.actionButton}
          </Button>
        </div>

        <p className="text-lg text-green-600 font-medium mb-4">{t.community}</p>
        <div className="flex justify-center space-x-4">
          <Link
            href="https://github.com/timqian/bambot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.165c-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.24 1.84 1.24 1.07 1.835 2.807 1.305 3.492.998.108-.775.42-1.305.763-1.605-2.665-.305-5.466-1.335-5.466-5.93 0-1.31.467-2.38 1.235-3.22-.123-.305-.535-1.53.117-3.18 0 0 1.008-.322 3.3 1.23.957-.266 1.98-.398 3-.403 1.02.005 2.043.137 3 .403 2.29-1.552 3.297-1.23 3.297-1.23.653 1.65.24 2.875.118 3.18.77.84 1.233 1.91 1.233 3.22 0 4.61-2.803 5.62-5.475 5.92.43.37.823 1.1.823 2.22v3.293c0 .32.218.694.825.577C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"
                fill="currentColor"
              />
            </svg>
            <span className="sr-only">GitHub</span>
          </Link>
          <Link
            href="https://x.com/tim_qian"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 512 462.799" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M403.229 0h78.506L310.219 196.04 512 462.799H354.002L230.261 301.007 88.669 462.799h-78.56l183.455-209.683L0 0h161.999l111.856 147.88L403.229 0zm-27.556 415.805h43.505L138.363 44.527h-46.68l283.99 371.278z"
                fill="currentColor"
              />
            </svg>
            <span className="sr-only">X</span>
          </Link>
          <Link
            href="https://discord.gg/Fq2gvSMyRJ"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                fill="currentColor"
              />
            </svg>
            <span className="sr-only">Discord</span>
          </Link>
          <Link
            href="https://i.v2ex.co/1U6OSqswl.jpeg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M21.502 19.525c1.524-1.105 2.498-2.738 2.498-4.554 0-3.326-3.237-6.023-7.229-6.023s-7.229 2.697-7.229 6.023c0 3.327 3.237 6.024 7.229 6.024.825 0 1.621-.117 2.36-.33l.212-.032c.139 0 .265.043.384.111l1.583.914.139.045c.133 0 .241-.108.241-.241l-.039-.176-.326-1.215-.025-.154c0-.162.08-.305.202-.392zm-12.827-17.228c-4.791 0-8.675 3.236-8.675 7.229 0 2.178 1.168 4.139 2.997 5.464.147.104.243.276.243.471l-.03.184-.391 1.458-.047.211c0 .16.13.29.289.29l.168-.054 1.899-1.097c.142-.082.293-.133.46-.133l.255.038c.886.255 1.842.397 2.832.397l.476-.012c-.188-.564-.291-1.158-.291-1.771 0-3.641 3.542-6.593 7.911-6.593l.471.012c-.653-3.453-4.24-6.094-8.567-6.094zm5.686 11.711c-.532 0-.963-.432-.963-.964 0-.533.431-.964.963-.964.533 0 .964.431.964.964 0 .532-.431.964-.964.964zm4.82 0c-.533 0-.964-.432-.964-.964 0-.533.431-.964.964-.964.532 0 .963.431.963.964 0 .532-.431.964-.963.964zm-13.398-5.639c-.639 0-1.156-.518-1.156-1.156 0-.639.517-1.157 1.156-1.157.639 0 1.157.518 1.157 1.157 0 .638-.518 1.156-1.157 1.156zm5.783 0c-.639 0-1.156-.518-1.156-1.156 0-.639.517-1.157 1.156-1.157.639 0 1.157.518 1.157 1.157 0 .638-.518 1.156-1.157 1.156z"
                fill="currentColor"
              />
            </svg>
            <span className="sr-only">WeChat</span>
          </Link>
        </div>
      </main>

      <footer className="bg-white py-6">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>Built with ❤️ by <a href="https://timqian.com">Tim Qian</a> © 2025</p>
        </div>
      </footer>
    </div>
  )
}

