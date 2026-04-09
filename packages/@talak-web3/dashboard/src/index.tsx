import React from 'react';
import { useTalakWeb3, useChain, useAccount } from '@talak-web3/hooks';

export function AdminDashboard() {
  const instance = useTalakWeb3();
  const { chainId } = useChain();
  const { address, isConnected } = useAccount();

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Talak-Web3 Admin</h1>
        <p className="text-gray-400">Unified Web3 Middleware Platform Control Center</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 mb-1">Status</h2>
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xl font-semibold">Active</span>
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 mb-1">Current Chain</h2>
          <span className="text-xl font-semibold">{chainId}</span>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 mb-1">Account</h2>
          <span className="text-xl font-semibold truncate">
            {isConnected ? address : 'Not Connected'}
          </span>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Plugin Registry</h2>
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Plugin Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Version</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {Array.from(instance.context.plugins.values()).map((plugin) => (
                <tr key={plugin.name}>
                  <td className="px-4 py-4 whitespace-nowrap">{plugin.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-400">{plugin.version}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-200">
                      Loaded
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
