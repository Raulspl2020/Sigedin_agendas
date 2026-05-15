import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const TableActionButtons = ({
    onEdit,
    onDelete,
    editTitle = 'Editar',
    deleteTitle = 'Eliminar',
    className = 'flex items-center justify-end space-x-2',
    iconSize = 18,
}) => {
    return (
        <div className={className}>
            {typeof onEdit === 'function' && (
                <button
                    onClick={onEdit}
                    className="p-2.5 bg-institutional-blue/10 text-institutional-blue rounded-xl hover:bg-institutional-blue hover:text-white transition-all shadow-sm active:scale-95"
                    title={editTitle}
                    type="button"
                >
                    <Edit2 size={iconSize} />
                </button>
            )}
            {typeof onDelete === 'function' && (
                <button
                    onClick={onDelete}
                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                    title={deleteTitle}
                    type="button"
                >
                    <Trash2 size={iconSize} />
                </button>
            )}
        </div>
    );
};

export default TableActionButtons;
