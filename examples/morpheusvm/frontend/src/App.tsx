import { useState } from 'react'
import { EIP712 } from './EIP712'
import { Snap } from './Snap'

function App() {
  const [eip712HyperAddr, setEIP712HyperAddr] = useState<string>("")
  const [snapAddr, setSnapAddr] = useState<string>("")

  return (
    <div className="flex">
      <div className="w-1/2 bg-white p-8">
        <h1 className="text-3xl font-bold mb-4">EIP712</h1>
        <EIP712 onHyperAddrChange={setEIP712HyperAddr} snapAddr={snapAddr} />
      </div>
      <div className="w-1/2 bg-gray-200 p-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Metamask Snap</h1>
        <Snap eip712HyperAddr={eip712HyperAddr} onAddrChanged={setSnapAddr} />
      </div>
    </div>
  )
}

export default App
