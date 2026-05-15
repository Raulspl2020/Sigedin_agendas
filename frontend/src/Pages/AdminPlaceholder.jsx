import React from 'react';
import Layout from '../components/Layout';
import { Construction } from 'lucide-react';

const AdminPlaceholder = ({ titulo }) => {
    return (
        <Layout>
            <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
                <div className="w-20 h-20 bg-institutional-green/10 rounded-full flex items-center justify-center mb-6 border border-institutional-green/20 animate-pulse">
                    <Construction className="text-institutional-green" size={40} />
                </div>
                <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tighter">
                    {titulo}
                </h1>
                <p className="text-gray-500 mt-2 max-w-md font-medium">
                    Estamos trabajando en la implementación de este módulo administrativo para ofrecerte la mejor experiencia en Sigedin Agendas.
                </p>
                <div className="mt-8 flex space-x-2">
                    <div className="w-2 h-2 bg-institutional-green rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-institutional-green rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-institutional-green rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
            </div>
        </Layout>
    );
};

export default AdminPlaceholder;
